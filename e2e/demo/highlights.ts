import { Page } from "@playwright/test";

const HIGHLIGHT_ID = "__demo_highlight__";
const ANNOTATION_ID = "__demo_annotation__";

export async function injectHighlight(
  page: Page,
  selector: string,
  annotation: string
): Promise<void> {
  await page.evaluate(
    ({ selector, annotation, hlId, annId }) => {
      const existing = document.getElementById(hlId);
      if (existing) existing.remove();
      const existingAnn = document.getElementById(annId);
      if (existingAnn) existingAnn.remove();

      const el = document.querySelector(selector);
      if (!el) return;

      const rect = el.getBoundingClientRect();

      const overlay = document.createElement("div");
      overlay.id = hlId;
      Object.assign(overlay.style, {
        position: "fixed",
        top: `${rect.top - 4}px`,
        left: `${rect.left - 4}px`,
        width: `${rect.width + 8}px`,
        height: `${rect.height + 8}px`,
        border: "3px solid #f59e0b",
        borderRadius: "8px",
        pointerEvents: "none",
        zIndex: "99998",
        boxShadow: "0 0 0 4px rgba(245, 158, 11, 0.25)",
        animation: "demoHighlightPulse 1s ease-in-out infinite",
      });

      const style = document.createElement("style");
      style.id = `${hlId}_style`;
      style.textContent = `
        @keyframes demoHighlightPulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.25); }
          50% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0.15); }
        }
        @keyframes demoAnnotationSlide {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `;
      document.head.appendChild(style);

      const ann = document.createElement("div");
      ann.id = annId;
      ann.textContent = annotation;

      const annTop = rect.top - 36;
      const useBelow = annTop < 10;

      Object.assign(ann.style, {
        position: "fixed",
        top: useBelow ? `${rect.bottom + 8}px` : `${annTop}px`,
        left: `${Math.max(8, rect.left)}px`,
        background: "#1e293b",
        color: "#fbbf24",
        padding: "4px 12px",
        borderRadius: "6px",
        fontSize: "13px",
        fontWeight: "600",
        fontFamily: "system-ui, -apple-system, sans-serif",
        zIndex: "99999",
        pointerEvents: "none",
        boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        animation: "demoAnnotationSlide 0.3s ease-out",
        maxWidth: "300px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      });

      document.body.appendChild(overlay);
      document.body.appendChild(ann);
    },
    { selector, annotation, hlId: HIGHLIGHT_ID, annId: ANNOTATION_ID }
  );
}

export async function removeHighlight(page: Page): Promise<void> {
  await page.evaluate(
    ({ hlId, annId }) => {
      const hl = document.getElementById(hlId);
      if (hl) hl.remove();
      const ann = document.getElementById(annId);
      if (ann) ann.remove();
      const style = document.getElementById(`${hlId}_style`);
      if (style) style.remove();
    },
    { hlId: HIGHLIGHT_ID, annId: ANNOTATION_ID }
  );
}

export async function showStepBanner(
  page: Page,
  stepLabel: string,
  actorLabel: string,
  actorColor: string
): Promise<void> {
  await page.evaluate(
    ({ stepLabel, actorLabel, actorColor }) => {
      const bannerId = "__demo_step_banner__";
      const existing = document.getElementById(bannerId);
      if (existing) existing.remove();

      const banner = document.createElement("div");
      banner.id = bannerId;
      banner.innerHTML = `<span style="
        background:${actorColor};
        color:white;
        padding:2px 8px;
        border-radius:4px;
        margin-right:8px;
        font-size:12px;
      ">${actorLabel}</span>${stepLabel}`;

      Object.assign(banner.style, {
        position: "fixed",
        bottom: "12px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "rgba(15, 23, 42, 0.92)",
        color: "#e2e8f0",
        padding: "8px 20px",
        borderRadius: "10px",
        fontSize: "14px",
        fontWeight: "500",
        fontFamily: "system-ui, -apple-system, sans-serif",
        zIndex: "99999",
        pointerEvents: "none",
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        backdropFilter: "blur(8px)",
        maxWidth: "90vw",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      });

      document.body.appendChild(banner);

      setTimeout(() => {
        if (banner.parentNode) {
          banner.style.transition = "opacity 0.5s";
          banner.style.opacity = "0";
          setTimeout(() => banner.remove(), 500);
        }
      }, 4000);
    },
    { stepLabel, actorLabel, actorColor }
  );
}

export async function removeAllOverlays(page: Page): Promise<void> {
  await page.evaluate(() => {
    const ids = [
      "__demo_highlight__",
      "__demo_annotation__",
      "__demo_highlight___style",
      "__demo_step_banner__",
    ];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  });
}
