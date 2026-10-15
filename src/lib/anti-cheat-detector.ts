/**
 * Client-Side Virtual Machine and AI Extension Injection Detector for Aptix.
 * Detects sandboxed/virtualized environments and third-party AI browser extensions.
 */

export interface VMDetectionResult {
  isVM: boolean;
  renderer: string;
  vendor: string;
  confidence: "HIGH" | "MEDIUM" | "NONE";
}

/**
 * Detects whether the candidate's browser is operating inside a Virtual Machine or emulator.
 */
export function detectVirtualMachine(): VMDetectionResult {
  if (typeof window === "undefined") {
    return { isVM: false, renderer: "", vendor: "", confidence: "NONE" };
  }

  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);

    if (!gl) {
      return { isVM: false, renderer: "No WebGL", vendor: "", confidence: "NONE" };
    }

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (!debugInfo) {
      return { isVM: false, renderer: "Masked", vendor: "", confidence: "NONE" };
    }

    const vendor = (gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || "").toLowerCase();
    const renderer = (gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "").toLowerCase();

    const vmKeywords = [
      "vmware",
      "virtualbox",
      "vbox",
      "llvmpipe",
      "swiftshader",
      "software rasterizer",
      "parallels",
      "qemu",
      "microsoft basic render driver",
      "virtual machine",
      "mesa offscreen",
    ];

    const isVM = vmKeywords.some(
      (keyword) => renderer.includes(keyword) || vendor.includes(keyword)
    );

    return {
      isVM,
      renderer,
      vendor,
      confidence: isVM ? "HIGH" : "NONE",
    };
  } catch (e) {
    return { isVM: false, renderer: "Error", vendor: "", confidence: "NONE" };
  }
}

/**
 * Mutation observer that monitors DOM tree injections by unauthorized third-party AI extensions.
 */
export function createExtensionGuardian(
  onDetected: (extensionName: string) => void
): () => void {
  if (typeof window === "undefined" || typeof MutationObserver === "undefined") {
    return () => {};
  }

  const suspiciousPatterns = [
    // AI Assistant extensions
    "chatgpt",
    "monica-root",
    "sider-root",
    "harpa-",
    "merlin-",
    "copilot",
    "ai-assistant",
    "extension-root",
    "gpt-prompt",
    "solve-ai",
    // Right-click, copy-paste, and selection unblocker extensions
    "allow-right-click",
    "enable-right-click",
    "absolute-enable-right-click",
    "supercopy",
    "unblock-contextmenu",
    "allow-copy",
    "enable-copy",
    "smart-right-click",
    "enable-select",
    "rightclick_",
    "copy-unblock",
    "enable-contextmenu",
    "force-copy",
    "simple-allow-copy",
  ];

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          const id = (el.id || "").toLowerCase();
          const className = typeof el.className === "string" ? el.className.toLowerCase() : "";
          const tagName = el.tagName.toLowerCase();

          // Check if it is a chrome extension iframe
          if (tagName === "iframe") {
            const src = (el.getAttribute("src") || "").toLowerCase();
            if (src.startsWith("chrome-extension://") || src.startsWith("moz-extension://")) {
              onDetected(`Injected extension iframe (${src.substring(0, 30)}...)`);
              return;
            }
          }

          // Check for injected style tags overriding user-select
          if (tagName === "style") {
            const css = (el.textContent || "").toLowerCase();
            if (css.includes("user-select") && (css.includes("auto") || css.includes("text")) && css.includes("!important")) {
              onDetected("Injected right-click / selection override stylesheet");
              return;
            }
          }

          // Check for extension bypass attributes
          if (
            el.hasAttribute?.("data-supercopy") ||
            el.hasAttribute?.("data-enable-right-click") ||
            el.hasAttribute?.("data-allow-copy") ||
            el.hasAttribute?.("data-unblock")
          ) {
            onDetected("Injected right-click bypass attribute");
            return;
          }

          // Check IDs and Classes
          for (const pattern of suspiciousPatterns) {
            if (id.includes(pattern) || className.includes(pattern)) {
              onDetected(`Injected extension element (${pattern})`);
              return;
            }
          }
        }
      }
    }
  });

  try {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  } catch (e) {
    console.warn("Extension guardian observe failed", e);
  }

  return () => {
    observer.disconnect();
  };
}
