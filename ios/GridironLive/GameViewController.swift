import UIKit
import WebKit

/// Hosts the game (web/index.html, bundled in the app) full-screen in a WKWebView.
/// Saves live in UserDefaults through a small key-value bridge:
///   - on launch every saved key is injected as `window.__NATIVE_KV__ = { key: value, ... }`
///   - the game calls `webkit.messageHandlers.kv.postMessage({ k, v })` to write (empty v deletes)
final class GameViewController: UIViewController, WKScriptMessageHandler {
    private var webView: WKWebView!
    private let prefix = "gl.kv."
    private let legacyKey = "gridiron.dynasty.v1"

    override func loadView() {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        let content = WKUserContentController()
        content.addUserScript(WKUserScript(source: bootstrapScript(), injectionTime: .atDocumentStart, forMainFrameOnly: true))
        content.add(WeakScriptHandler(self), name: "kv")
        config.userContentController = content

        webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.035, green: 0.047, blue: 0.07, alpha: 1)
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.allowsLinkPreview = false
        if #available(iOS 16.4, *) { webView.isInspectable = true }
        view = webView
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        guard let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "web") else {
            webView.loadHTMLString("<h1 style='color:white;font-family:sans-serif'>Game files missing from the app bundle.</h1>", baseURL: nil)
            return
        }
        webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
    }

    private func bootstrapScript() -> String {
        var store: [String: String] = [:]
        for (key, value) in UserDefaults.standard.dictionaryRepresentation() where key.hasPrefix(prefix) {
            if let s = value as? String { store[String(key.dropFirst(prefix.count))] = s }
        }
        var js = "window.__NATIVE_KV__ = \(Self.jsonObject(store));"
        if let legacy = UserDefaults.standard.string(forKey: legacyKey), !legacy.isEmpty {
            js += "window.__NATIVE_SAVE__ = \(Self.jsString(legacy));"
        }
        return js
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "kv", let body = message.body as? [String: Any], let key = body["k"] as? String else { return }
        let value = body["v"] as? String ?? ""
        if value.isEmpty {
            UserDefaults.standard.removeObject(forKey: prefix + key)
        } else {
            UserDefaults.standard.set(value, forKey: prefix + key)
        }
    }

    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }
    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge { .all }

    private static func jsString(_ s: String) -> String {
        guard let data = try? JSONEncoder().encode(s), let lit = String(data: data, encoding: .utf8) else { return "\"\"" }
        return lit.replacingOccurrences(of: "\u{2028}", with: "\\u2028").replacingOccurrences(of: "\u{2029}", with: "\\u2029")
    }

    private static func jsonObject(_ d: [String: String]) -> String {
        guard let data = try? JSONEncoder().encode(d), let lit = String(data: data, encoding: .utf8) else { return "{}" }
        return lit.replacingOccurrences(of: "\u{2028}", with: "\\u2028").replacingOccurrences(of: "\u{2029}", with: "\\u2029")
    }
}

/// Avoids a retain cycle between WKUserContentController and the view controller.
private final class WeakScriptHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?
    init(_ target: WKScriptMessageHandler) { self.target = target }
    func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage) {
        target?.userContentController(c, didReceive: message)
    }
}
