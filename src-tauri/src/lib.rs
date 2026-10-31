use std::{
    cmp::Ordering, env, fs, io, iter::Peekable, path::Path, str::Chars, sync::Mutex, time::Duration,
};

use notify_debouncer_mini::{
    DebounceEventResult, Debouncer, new_debouncer,
    notify::{RecommendedWatcher, RecursiveMode},
};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_window_state::StateFlags;

const MARKDOWN_EXTENSIONS: [&str; 2] = ["md", "markdown"];
const IMAGE_EXTENSIONS: [&str; 8] = ["png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "bmp"];
const WATCH_DEBOUNCE: Duration = Duration::from_millis(150);

struct AppState {
    start_path: Option<String>,
    watcher: Mutex<Option<Debouncer<RecommendedWatcher>>>,
}

#[derive(Debug, Serialize)]
struct Document {
    name: String,
    path: String,
    text: String,
}

#[derive(Debug, Serialize)]
struct FileEntry {
    name: String,
    path: String,
}

fn decode(bytes: &[u8]) -> String {
    match bytes {
        [0xEF, 0xBB, 0xBF, rest @ ..] => String::from_utf8_lossy(rest).into_owned(),
        [0xFF, 0xFE, rest @ ..] => decode_utf16(rest, u16::from_le_bytes),
        [0xFE, 0xFF, rest @ ..] => decode_utf16(rest, u16::from_be_bytes),
        _ => String::from_utf8_lossy(bytes).into_owned(),
    }
}

fn decode_utf16(bytes: &[u8], to_unit: fn([u8; 2]) -> u16) -> String {
    let units: Vec<u16> = bytes
        .chunks_exact(2)
        .map(|pair| to_unit([pair[0], pair[1]]))
        .collect();
    String::from_utf16_lossy(&units)
}

fn has_extension(path: &Path, extensions: &[&str]) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| {
            extensions
                .iter()
                .any(|allowed| extension.eq_ignore_ascii_case(allowed))
        })
}

fn is_markdown(path: &Path) -> bool {
    has_extension(path, &MARKDOWN_EXTENSIONS)
}

fn is_image(path: &Path) -> bool {
    has_extension(path, &IMAGE_EXTENSIONS)
}

fn take_number(chars: &mut Peekable<Chars>) -> String {
    let mut digits = String::new();
    while let Some(digit) = chars.next_if(char::is_ascii_digit) {
        digits.push(digit);
    }
    digits
}

fn compare_numbers(a: &str, b: &str) -> Ordering {
    let (a, b) = (a.trim_start_matches('0'), b.trim_start_matches('0'));
    a.len().cmp(&b.len()).then_with(|| a.cmp(b))
}

fn natural_cmp(a: &str, b: &str) -> Ordering {
    let (a, b) = (a.to_lowercase(), b.to_lowercase());
    let (mut left, mut right) = (a.chars().peekable(), b.chars().peekable());
    loop {
        let order = match (left.peek().copied(), right.peek().copied()) {
            (None, None) => return Ordering::Equal,
            (None, Some(_)) => return Ordering::Less,
            (Some(_), None) => return Ordering::Greater,
            (Some(x), Some(y)) if x.is_ascii_digit() && y.is_ascii_digit() => {
                compare_numbers(&take_number(&mut left), &take_number(&mut right))
            }
            (Some(x), Some(y)) => {
                left.next();
                right.next();
                x.cmp(&y)
            }
        };
        if order != Ordering::Equal {
            return order;
        }
    }
}

fn file_name(path: &Path) -> String {
    path.file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .into_owned()
}

fn list_markdown(folder: &Path) -> io::Result<Vec<FileEntry>> {
    let mut files = Vec::new();
    for entry in fs::read_dir(folder)?.flatten() {
        let path = entry.path();
        if path.is_file() && is_markdown(&path) {
            files.push(FileEntry {
                name: file_name(&path),
                path: path.to_string_lossy().into_owned(),
            });
        }
    }
    files.sort_by(|a, b| natural_cmp(&a.name, &b.name));
    Ok(files)
}

fn read_file(path: &Path) -> Result<Document, String> {
    if !is_markdown(path) {
        return Err("unreadable".to_string());
    }
    let bytes = fs::read(path).map_err(|error| match error.kind() {
        io::ErrorKind::NotFound => "missing".to_string(),
        _ => "unreadable".to_string(),
    })?;
    Ok(Document {
        name: file_name(path),
        path: path.to_string_lossy().into_owned(),
        text: decode(&bytes),
    })
}

fn path_from_args(args: &[String], cwd: &Path) -> Option<String> {
    args.iter()
        .skip(1)
        .filter(|arg| !arg.starts_with('-'))
        .map(Path::new)
        .find(|path| is_markdown(path))
        .map(|path| cwd.join(path).to_string_lossy().into_owned())
}

#[tauri::command]
fn initial_path(state: State<AppState>) -> Option<String> {
    state.start_path.clone()
}

#[tauri::command(async)]
fn read_document(path: String) -> Result<Document, String> {
    read_file(Path::new(&path))
}

#[tauri::command(async)]
fn list_folder(path: String) -> Result<Vec<FileEntry>, String> {
    list_markdown(Path::new(&path)).map_err(|_| "unreadable".to_string())
}

#[tauri::command]
fn watch_folder(app: AppHandle, state: State<AppState>, path: String) -> Result<(), String> {
    let mut debouncer = new_debouncer(WATCH_DEBOUNCE, move |result: DebounceEventResult| {
        if let Ok(events) = result {
            let paths: Vec<String> = events
                .iter()
                .map(|event| event.path.to_string_lossy().into_owned())
                .collect();
            let _ = app.emit("folder-changed", paths);
        }
    })
    .map_err(|_| "unreadable".to_string())?;
    debouncer
        .watcher()
        .watch(Path::new(&path), RecursiveMode::NonRecursive)
        .map_err(|_| "unreadable".to_string())?;
    *state.watcher.lock().unwrap() = Some(debouncer);
    Ok(())
}

#[tauri::command]
fn allow_images(app: AppHandle, paths: Vec<String>) -> Result<(), String> {
    let scope = app.asset_protocol_scope();
    for path in paths.iter().map(Path::new).filter(|path| is_image(path)) {
        scope
            .allow_file(path)
            .map_err(|_| "unreadable".to_string())?;
    }
    Ok(())
}

fn second_launch(app: &AppHandle, args: Vec<String>, cwd: String) {
    if let Some(path) = path_from_args(&args, Path::new(&cwd)) {
        let _ = app.emit("open-path", path);
    }
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

pub fn run() {
    let args: Vec<String> = env::args_os()
        .map(|arg| arg.to_string_lossy().into_owned())
        .collect();
    let start_path = env::current_dir()
        .ok()
        .and_then(|cwd| path_from_args(&args, &cwd));

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            second_launch(app, args, cwd);
        }))
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .with_state_flags(StateFlags::all() & !StateFlags::VISIBLE)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            start_path,
            watcher: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            initial_path,
            read_document,
            list_folder,
            watch_folder,
            allow_images
        ])
        .run(tauri::generate_context!())
        .expect("error while running MyMD");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn decode_strips_utf8_bom() {
        assert_eq!(decode(b"\xEF\xBB\xBF# Hi"), "# Hi");
    }

    #[test]
    fn decode_replaces_invalid_utf8() {
        assert_eq!(decode(b"a\xFFb"), "a\u{FFFD}b");
    }

    #[test]
    fn decode_reads_utf16_le() {
        let bytes: Vec<u8> = [0xFF, 0xFE]
            .into_iter()
            .chain("# Hi".encode_utf16().flat_map(u16::to_le_bytes))
            .collect();
        assert_eq!(decode(&bytes), "# Hi");
    }

    #[test]
    fn decode_reads_utf16_be() {
        let bytes: Vec<u8> = [0xFE, 0xFF]
            .into_iter()
            .chain("# Hi".encode_utf16().flat_map(u16::to_be_bytes))
            .collect();
        assert_eq!(decode(&bytes), "# Hi");
    }

    #[test]
    fn markdown_check_ignores_case() {
        assert!(is_markdown(Path::new("A.MD")) && is_markdown(Path::new("a.markdown")));
        assert!(!is_markdown(Path::new("a.txt")) && !is_markdown(Path::new("md")));
    }

    #[test]
    fn image_check_rejects_programs() {
        assert!(is_image(Path::new("a.PNG")) && is_image(Path::new("a.svg")));
        assert!(!is_image(Path::new("a.exe")));
    }

    #[test]
    fn natural_order_is_numeric_and_case_insensitive() {
        assert_eq!(natural_cmp("note2.md", "note10.md"), Ordering::Less);
        assert_eq!(natural_cmp("a.md", "B.md"), Ordering::Less);
    }

    #[test]
    fn natural_order_handles_numbers_too_long_for_an_integer() {
        let (small, big) = ("99999999999999999999999.md", "100000000000000000000000.md");
        assert_eq!(natural_cmp(small, big), Ordering::Less);
    }

    #[test]
    fn listing_is_flat_filtered_and_sorted() {
        let dir = tempfile::tempdir().unwrap();
        for name in ["b.markdown", "a.md", "c.txt"] {
            fs::write(dir.path().join(name), "").unwrap();
        }
        fs::create_dir(dir.path().join("sub")).unwrap();
        fs::write(dir.path().join("sub").join("d.md"), "").unwrap();
        let names: Vec<String> = list_markdown(dir.path())
            .unwrap()
            .into_iter()
            .map(|f| f.name)
            .collect();
        assert_eq!(names, ["a.md", "b.markdown"]);
    }

    #[test]
    fn reading_reports_missing_files() {
        assert_eq!(
            read_file(Path::new("C:\\nope\\a.md")).unwrap_err(),
            "missing"
        );
    }

    #[test]
    fn reading_rejects_other_files() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("a.txt");
        fs::write(&path, "x").unwrap();
        assert_eq!(read_file(&path).unwrap_err(), "unreadable");
    }

    #[test]
    fn reading_returns_the_name_path_and_text() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("a.md");
        fs::write(&path, "\u{FEFF}# Hi").unwrap();
        let document = read_file(&path).unwrap();
        assert_eq!(document.name, "a.md");
        assert_eq!(document.path, path.to_string_lossy());
        assert_eq!(document.text, "# Hi");
    }

    #[test]
    fn args_give_first_markdown_as_absolute_path() {
        let args: Vec<String> = ["mymd.exe", "--flag", "notes\\a.md", "b.md"]
            .map(String::from)
            .to_vec();
        assert_eq!(
            path_from_args(&args, Path::new("C:\\work")),
            Some("C:\\work\\notes\\a.md".to_string())
        );
    }

    #[test]
    fn args_ignore_the_program_itself() {
        let args = vec!["C:\\tools\\viewer.md".to_string()];
        assert_eq!(path_from_args(&args, Path::new("C:\\work")), None);
    }
}
