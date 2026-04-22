use std::path::{Path, PathBuf};

pub fn package_relative_dir(name: &str) -> Option<PathBuf> {
    let exe_path = std::env::current_exe().ok()?;
    package_relative_dir_from_exe(&exe_path, name)
}

fn package_relative_dir_from_exe(exe_path: &Path, name: &str) -> Option<PathBuf> {
    let package_root = exe_path.parent()?.parent()?;
    let candidate = package_root.join(name);
    candidate.is_dir().then_some(candidate)
}

fn source_relative_dir_from_exe(exe_path: &Path, source_relative_path: &str) -> Option<PathBuf> {
    let mut profile_dir = exe_path.parent()?;
    if profile_dir
        .file_name()
        .is_some_and(|segment| segment == "deps")
    {
        profile_dir = profile_dir.parent()?;
    }

    let target_dir = profile_dir.parent()?;
    if target_dir
        .file_name()
        .is_none_or(|segment| segment != "target")
    {
        return None;
    }

    let crate_dir = target_dir.parent()?;
    let candidate = crate_dir.join(source_relative_path);
    candidate.is_dir().then_some(candidate)
}

fn source_relative_dir_from_cwd(source_relative_path: &str) -> Option<PathBuf> {
    let candidate = std::env::current_dir().ok()?.join(source_relative_path);
    candidate.is_dir().then_some(candidate)
}

pub fn env_or_package_or_source_dir(
    env_name: &str,
    package_name: &str,
    source_relative_path: &str,
) -> PathBuf {
    std::env::var(env_name)
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
        .or_else(|| package_relative_dir(package_name))
        .or_else(|| {
            std::env::current_exe()
                .ok()
                .and_then(|exe_path| source_relative_dir_from_exe(&exe_path, source_relative_path))
        })
        .or_else(|| source_relative_dir_from_cwd(source_relative_path))
        .unwrap_or_else(|| PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(source_relative_path))
}

#[cfg(test)]
mod tests {
    use super::{package_relative_dir_from_exe, source_relative_dir_from_exe};

    #[test]
    fn resolves_package_relative_directories_from_packaged_binary_path() {
        let root = std::env::temp_dir().join(format!(
            "resq-flow-package-path-test-{}",
            std::process::id(),
        ));
        let bin_dir = root.join("bin");
        let flows_dir = root.join("flows");
        std::fs::create_dir_all(&bin_dir).expect("create bin dir");
        std::fs::create_dir_all(&flows_dir).expect("create flows dir");

        let resolved = package_relative_dir_from_exe(&bin_dir.join("resq-flow-relay"), "flows")
            .expect("resolve package flows dir");
        assert_eq!(resolved, flows_dir);

        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn resolves_source_relative_directories_from_cargo_debug_binary_path() {
        let root = std::env::temp_dir()
            .join(format!("resq-flow-source-path-test-{}", std::process::id(),));
        let relay_dir = root.join("relay");
        let target_dir = relay_dir.join("target/debug");
        let contracts_dir = root.join("ui/src/flow-contracts");
        std::fs::create_dir_all(&target_dir).expect("create target dir");
        std::fs::create_dir_all(&contracts_dir).expect("create contracts dir");

        let resolved = source_relative_dir_from_exe(
            &target_dir.join("resq-flow-relay"),
            "../ui/src/flow-contracts",
        )
        .expect("resolve source dir");
        assert_eq!(
            resolved.canonicalize().expect("canonical resolved path"),
            contracts_dir
                .canonicalize()
                .expect("canonical contracts path")
        );

        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn resolves_source_relative_directories_from_cargo_test_binary_path() {
        let root = std::env::temp_dir().join(format!(
            "resq-flow-test-source-path-test-{}",
            std::process::id(),
        ));
        let relay_dir = root.join("relay");
        let target_dir = relay_dir.join("target/debug/deps");
        let contracts_dir = root.join("ui/src/flow-contracts");
        std::fs::create_dir_all(&target_dir).expect("create test target dir");
        std::fs::create_dir_all(&contracts_dir).expect("create contracts dir");

        let resolved = source_relative_dir_from_exe(
            &target_dir.join("capabilities-test-binary"),
            "../ui/src/flow-contracts",
        )
        .expect("resolve source dir");
        assert_eq!(
            resolved.canonicalize().expect("canonical resolved path"),
            contracts_dir
                .canonicalize()
                .expect("canonical contracts path")
        );

        let _ = std::fs::remove_dir_all(root);
    }
}
