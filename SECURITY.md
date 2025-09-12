# Security Policy

## Supported Versions

We actively support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it to us as follows:

1. **Do not** create a public GitHub issue for the vulnerability
2. Email security concerns to: [INSERT CONTACT EMAIL]
3. Include detailed information about the vulnerability
4. Allow reasonable time for us to respond and fix the issue before public disclosure

## Security Considerations

This application processes video and audio files. Please be aware:

- Video files are processed locally on the user's system
- FFmpeg binaries are included for audio extraction
- Whisper models may be downloaded from external sources
- API keys for cloud services are stored locally
- Always verify the source code before running on sensitive systems
- Be cautious when processing files from untrusted sources

## Responsible Disclosure

We kindly ask that you:
- Give us reasonable time to fix the issue before public disclosure
- Avoid accessing or modifying user data without permission
- Do not perform DoS attacks or degrade service availability
- Respect user privacy and data protection

Thank you for helping keep Video Transcriber secure!