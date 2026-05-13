import Cocoa
import WebKit

struct StartupError: Error {
    let message: String
}

final class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate, WKNavigationDelegate, WKScriptMessageHandler {
    private var window: NSWindow!
    private var webView: WKWebView!
    private var loadingView: NSView!
    private var loadingTitleLabel: NSTextField!
    private var loadingSubtitleLabel: NSTextField!
    private var loadingStatusLabel: NSTextField!
    private var loadingSpinner: NSProgressIndicator!
    private var closeConfirmed = false
    private var shutdownInProgress = false
    private var terminationReplyPending = false

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        buildWindow()
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        startConsoleAndLoad()
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }

    func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
        if closeConfirmed {
            return .terminateNow
        }
        terminationReplyPending = true
        beginShutdownThenQuit()
        return .terminateLater
    }

    private func buildWindow() {
        let configuration = WKWebViewConfiguration()
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = true
        configuration.userContentController.add(self, name: "whalematesNative")
        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.autoresizingMask = [.width, .height]

        loadingView = NSView(frame: .zero)
        loadingView.wantsLayer = true
        loadingView.layer?.backgroundColor = NSColor(calibratedRed: 0.969, green: 0.953, blue: 1.0, alpha: 1).cgColor
        loadingView.autoresizingMask = [.width, .height]

        let card = NSView()
        card.wantsLayer = true
        card.layer?.backgroundColor = NSColor(calibratedWhite: 1.0, alpha: 0.86).cgColor
        card.layer?.cornerRadius = 28
        card.layer?.borderColor = NSColor(calibratedWhite: 1.0, alpha: 0.82).cgColor
        card.layer?.borderWidth = 1
        card.layer?.shadowColor = NSColor(calibratedRed: 0.23, green: 0.16, blue: 0.42, alpha: 0.24).cgColor
        card.layer?.shadowOpacity = 1
        card.layer?.shadowRadius = 34
        card.layer?.shadowOffset = CGSize(width: 0, height: 18)
        card.translatesAutoresizingMaskIntoConstraints = false

        let logo = NSTextField(labelWithString: "W")
        logo.alignment = .center
        logo.font = NSFont.systemFont(ofSize: 26, weight: .heavy)
        logo.textColor = NSColor(calibratedRed: 0.15, green: 0.11, blue: 0.25, alpha: 1)
        logo.wantsLayer = true
        logo.layer?.backgroundColor = NSColor(calibratedRed: 1.0, green: 0.83, blue: 0.36, alpha: 1).cgColor
        logo.layer?.cornerRadius = 18
        logo.translatesAutoresizingMaskIntoConstraints = false

        loadingTitleLabel = makeLoadingLabel(
            "Starting Whalemates Chat",
            size: 25,
            weight: .bold,
            color: NSColor(calibratedRed: 0.14, green: 0.10, blue: 0.22, alpha: 1)
        )
        loadingSubtitleLabel = makeLoadingLabel(
            "Preparing your local console.",
            size: 14,
            weight: .medium,
            color: NSColor(calibratedRed: 0.42, green: 0.36, blue: 0.52, alpha: 1)
        )
        loadingStatusLabel = makeLoadingLabel(
            "Checking Python and local services...",
            size: 12,
            weight: .semibold,
            color: NSColor(calibratedRed: 0.39, green: 0.27, blue: 0.95, alpha: 1)
        )

        loadingSpinner = NSProgressIndicator()
        loadingSpinner.style = .spinning
        loadingSpinner.controlSize = .small
        loadingSpinner.isIndeterminate = true
        loadingSpinner.startAnimation(nil)
        loadingSpinner.translatesAutoresizingMaskIntoConstraints = false

        let progressTrack = NSView()
        progressTrack.wantsLayer = true
        progressTrack.layer?.backgroundColor = NSColor(calibratedRed: 0.89, green: 0.86, blue: 0.98, alpha: 1).cgColor
        progressTrack.layer?.cornerRadius = 3
        progressTrack.translatesAutoresizingMaskIntoConstraints = false

        let progressFill = NSView()
        progressFill.wantsLayer = true
        progressFill.layer?.backgroundColor = NSColor(calibratedRed: 0.44, green: 0.30, blue: 1.0, alpha: 1).cgColor
        progressFill.layer?.cornerRadius = 3
        progressFill.translatesAutoresizingMaskIntoConstraints = false
        progressTrack.addSubview(progressFill)

        card.addSubview(logo)
        card.addSubview(loadingTitleLabel)
        card.addSubview(loadingSubtitleLabel)
        card.addSubview(progressTrack)
        card.addSubview(loadingSpinner)
        card.addSubview(loadingStatusLabel)
        loadingView.addSubview(card)

        NSLayoutConstraint.activate([
            card.centerXAnchor.constraint(equalTo: loadingView.centerXAnchor),
            card.centerYAnchor.constraint(equalTo: loadingView.centerYAnchor),
            card.widthAnchor.constraint(equalToConstant: 420),
            card.heightAnchor.constraint(equalToConstant: 270),

            logo.topAnchor.constraint(equalTo: card.topAnchor, constant: 34),
            logo.centerXAnchor.constraint(equalTo: card.centerXAnchor),
            logo.widthAnchor.constraint(equalToConstant: 58),
            logo.heightAnchor.constraint(equalToConstant: 58),

            loadingTitleLabel.topAnchor.constraint(equalTo: logo.bottomAnchor, constant: 22),
            loadingTitleLabel.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 34),
            loadingTitleLabel.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -34),

            loadingSubtitleLabel.topAnchor.constraint(equalTo: loadingTitleLabel.bottomAnchor, constant: 8),
            loadingSubtitleLabel.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 38),
            loadingSubtitleLabel.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -38),

            progressTrack.topAnchor.constraint(equalTo: loadingSubtitleLabel.bottomAnchor, constant: 28),
            progressTrack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 58),
            progressTrack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -58),
            progressTrack.heightAnchor.constraint(equalToConstant: 6),

            progressFill.leadingAnchor.constraint(equalTo: progressTrack.leadingAnchor),
            progressFill.topAnchor.constraint(equalTo: progressTrack.topAnchor),
            progressFill.bottomAnchor.constraint(equalTo: progressTrack.bottomAnchor),
            progressFill.widthAnchor.constraint(equalTo: progressTrack.widthAnchor, multiplier: 0.62),

            loadingSpinner.topAnchor.constraint(equalTo: progressTrack.bottomAnchor, constant: 20),
            loadingSpinner.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 116),
            loadingSpinner.widthAnchor.constraint(equalToConstant: 16),
            loadingSpinner.heightAnchor.constraint(equalToConstant: 16),

            loadingStatusLabel.centerYAnchor.constraint(equalTo: loadingSpinner.centerYAnchor),
            loadingStatusLabel.leadingAnchor.constraint(equalTo: loadingSpinner.trailingAnchor, constant: 9),
            loadingStatusLabel.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -42),
        ])

        let contentView = NSView(frame: NSRect(x: 0, y: 0, width: 1180, height: 760))
        contentView.addSubview(webView)
        contentView.addSubview(loadingView)
        webView.frame = contentView.bounds
        loadingView.frame = contentView.bounds

        window = NSWindow(
            contentRect: contentView.frame,
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "Whalemates Chat"
        window.minSize = NSSize(width: 960, height: 640)
        window.center()
        window.contentView = contentView
        window.isReleasedWhenClosed = false
        window.delegate = self
    }

    func windowShouldClose(_ sender: NSWindow) -> Bool {
        if closeConfirmed {
            return true
        }

        beginShutdownThenQuit()
        return false
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "whalematesNative" else {
            return
        }

        if let payload = message.body as? [String: Any],
           payload["type"] as? String == "console.closed" {
            closeConfirmed = true
            window.close()
            NSApp.terminate(nil)
        }
    }

    private func beginShutdownThenQuit() {
        if shutdownInProgress {
            return
        }
        shutdownInProgress = true
        showLoadingMessage(
            title: "Stopping Whalemates Chat",
            subtitle: "Closing the console and local services.",
            status: "Stopping dashboard and Telegram listener..."
        )
        shutdownConsole {
            DispatchQueue.main.async {
                self.closeConfirmed = true
                self.shutdownInProgress = false
                self.window.close()
                if self.terminationReplyPending {
                    self.terminationReplyPending = false
                    NSApp.reply(toApplicationShouldTerminate: true)
                }
                NSApp.terminate(nil)
            }
        }
    }

    private func makeLoadingLabel(_ text: String, size: CGFloat, weight: NSFont.Weight, color: NSColor) -> NSTextField {
        let label = NSTextField(labelWithString: text)
        label.alignment = .center
        label.font = NSFont.systemFont(ofSize: size, weight: weight)
        label.lineBreakMode = .byTruncatingTail
        label.textColor = color
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }

    private func showLoadingMessage(title: String, subtitle: String, status: String) {
        loadingTitleLabel.stringValue = title
        loadingSubtitleLabel.stringValue = subtitle
        loadingStatusLabel.stringValue = status
        loadingSpinner.startAnimation(nil)
        loadingView.isHidden = false
        if let contentView = window.contentView {
            loadingView.removeFromSuperview()
            loadingView.frame = contentView.bounds
            contentView.addSubview(loadingView)
        }
    }

    private func shutdownConsole(completion: @escaping () -> Void) {
        let finish = {
            self.stopLaunchAgents(completion: completion)
        }

        let script = """
        fetch('/api/console/shutdown', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}'
        }).catch(() => null).then(() => true)
        """

        DispatchQueue.main.async {
            self.webView.evaluateJavaScript(script) { _, _ in
                DispatchQueue.global(qos: .utility).asyncAfter(deadline: .now() + 0.35) {
                    finish()
                }
            }
        }
    }

    private func stopLaunchAgents(completion: @escaping () -> Void) {
        let command = """
        launchctl bootout "gui/$(id -u)" "$HOME/Library/LaunchAgents/whalemates-bot-listener.plist" >/dev/null 2>&1 || true
        launchctl bootout "gui/$(id -u)" "$HOME/Library/LaunchAgents/whalemates-chat-console.plist" >/dev/null 2>&1 || true
        pkill -f ' -m back listen' >/dev/null 2>&1 || true
        pkill -f ' -m back chat --host 127.0.0.1 --port 8765' >/dev/null 2>&1 || true
        """

        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/bin/zsh")
        process.arguments = ["-lc", command]

        do {
            try process.run()
            process.waitUntilExit()
        } catch {
            // Best effort cleanup. Quit the app even if shell cleanup fails.
        }
        completion()
    }

    private func startConsoleAndLoad() {
        DispatchQueue.global(qos: .userInitiated).async {
            let result = self.runInstaller()
            DispatchQueue.main.async {
                switch result {
                case .success(let urlString):
                    self.load(urlString: urlString)
                case .failure(let error):
                    self.showStartupError(error.message)
                }
            }
        }
    }

    private func runInstaller() -> Result<String, StartupError> {
        guard let resourcePath = Bundle.main.resourcePath else {
            return .failure(StartupError(message: "App resources are missing."))
        }

        let installer = "\(resourcePath)/install_console.sh"
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/bin/bash")
        process.arguments = [installer]

        let output = Pipe()
        let error = Pipe()
        process.standardOutput = output
        process.standardError = error

        do {
            try process.run()
            process.waitUntilExit()
        } catch {
            return .failure(StartupError(message: error.localizedDescription))
        }

        let outputData = output.fileHandleForReading.readDataToEndOfFile()
        let errorData = error.fileHandleForReading.readDataToEndOfFile()
        let stdout = String(data: outputData, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let stderr = String(data: errorData, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""

        guard process.terminationStatus == 0 else {
            return .failure(StartupError(message: stderr.isEmpty ? "Console failed to start." : stderr))
        }

        return .success(stdout.isEmpty ? "http://127.0.0.1:8765/app.html" : stdout)
    }

    private func load(urlString: String) {
        guard let url = URL(string: urlString) else {
            showStartupError("Invalid console URL: \(urlString)")
            return
        }
        showLoadingMessage(
            title: "Opening Whalemates Chat",
            subtitle: "Your local console is ready.",
            status: "Loading secure dashboard..."
        )
        webView.load(URLRequest(url: url))
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        loadingView.isHidden = true
    }

    private func showStartupError(_ message: String) {
        showLoadingMessage(
            title: "Could not start Whalemates Chat",
            subtitle: "The local console failed to become ready.",
            status: "Check the startup details below."
        )
        let alert = NSAlert()
        alert.messageText = "Whalemates Chat could not start"
        alert.informativeText = message
        alert.alertStyle = .warning
        alert.addButton(withTitle: "OK")
        alert.runModal()
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
