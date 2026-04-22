# VERSION_MAP.md

Auto-generated version structure map for Video Transcriber.

## Current Version

| Component        | Version |
| ---------------- | ------- |
| Application      | 1.0.0   |
| Electron         | ^28.0.0 |
| Electron Builder | ^24.9.1 |
| Node.js (target) | 24      |

## Version History

| Version | Archive                              | Notes                                              |
| ------- | ------------------------------------ | -------------------------------------------------- |
| 0.0.1   | `archive/v0.0.1_20260207_012213.zip` | Initial prototype                                  |
| 1.0.0   | Current                              | Production release — Neo-Noir UI, IPC architecture |

## Directory Structure at v1.0.0

```
video-transcriber/
├── src/               # Application source
├── resources/         # Icons and screenshots
├── docs/              # Full documentation suite
├── tests/             # Test suite
├── legacy/            # Deprecated code
├── archive/           # Version snapshots
└── .github/           # CI/CD workflows
```

## Platform Build Targets

| Platform | Targets                        |
| -------- | ------------------------------ |
| macOS    | DMG, ZIP (x64, arm64)          |
| Windows  | NSIS, ZIP (x64, ia32)          |
| Linux    | AppImage, DEB, SNAP, ZIP (x64) |

## Maintained By

J. Michaels — https://github.com/sanchez314c
