export interface WindowPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TilingLayout {
  [role: string]: WindowPosition;
}

const COLORS: Record<string, string> = {
  qm: "#ef4444",
  player1: "#3b82f6",
  player2: "#22c55e",
  cap1: "#3b82f6",
  cap2: "#22c55e",
  cap3: "#a855f7",
};

const LABELS: Record<string, string> = {
  qm: "Quizmaster",
  player1: "Player 1",
  player2: "Player 2",
  cap1: "Captain 1 (Alpha)",
  cap2: "Captain 2 (Beta)",
  cap3: "Captain 3 (Gamma)",
};

export function getColor(role: string): string {
  return COLORS[role] || "#6b7280";
}

export function getLabel(role: string): string {
  return LABELS[role] || role;
}

export function getIndividualLayout(
  screenWidth = 1920,
  screenHeight = 1080
): TilingLayout {
  const halfW = Math.floor(screenWidth / 2);
  const halfH = Math.floor(screenHeight / 2);
  const padding = 5;

  return {
    qm: {
      x: padding,
      y: padding,
      width: halfW - padding * 2,
      height: halfH - padding * 2,
    },
    player1: {
      x: halfW + padding,
      y: padding,
      width: halfW - padding * 2,
      height: halfH - padding * 2,
    },
    player2: {
      x: Math.floor(screenWidth / 4) + padding,
      y: halfH + padding,
      width: halfW - padding * 2,
      height: halfH - padding * 2,
    },
  };
}

export function getTeamLayout(
  actorCount: number,
  screenWidth = 1920,
  screenHeight = 1080
): TilingLayout {
  const halfW = Math.floor(screenWidth / 2);
  const halfH = Math.floor(screenHeight / 2);
  const padding = 5;

  if (actorCount <= 3) {
    return {
      qm: {
        x: padding,
        y: padding,
        width: halfW - padding * 2,
        height: halfH - padding * 2,
      },
      cap1: {
        x: halfW + padding,
        y: padding,
        width: halfW - padding * 2,
        height: halfH - padding * 2,
      },
      cap2: {
        x: Math.floor(screenWidth / 4) + padding,
        y: halfH + padding,
        width: halfW - padding * 2,
        height: halfH - padding * 2,
      },
    };
  }

  return {
    qm: {
      x: padding,
      y: padding,
      width: halfW - padding * 2,
      height: halfH - padding * 2,
    },
    cap1: {
      x: halfW + padding,
      y: padding,
      width: halfW - padding * 2,
      height: halfH - padding * 2,
    },
    cap2: {
      x: padding,
      y: halfH + padding,
      width: halfW - padding * 2,
      height: halfH - padding * 2,
    },
    cap3: {
      x: halfW + padding,
      y: halfH + padding,
      width: halfW - padding * 2,
      height: halfH - padding * 2,
    },
  };
}

export function getLayout(
  mode: "individual" | "team",
  actorCount: number,
  screenWidth?: number,
  screenHeight?: number
): TilingLayout {
  if (mode === "individual") {
    return getIndividualLayout(screenWidth, screenHeight);
  }
  return getTeamLayout(actorCount, screenWidth, screenHeight);
}

export function getRoleBorderCSS(role: string): string {
  const color = getColor(role);
  const label = getLabel(role);
  return `
    body {
      border: 4px solid ${color} !important;
      box-sizing: border-box;
    }
    body::before {
      content: "${label}";
      position: fixed;
      top: 8px;
      left: 8px;
      background: ${color};
      color: white;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 700;
      z-index: 99999;
      font-family: system-ui, -apple-system, sans-serif;
      letter-spacing: 0.02em;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
  `;
}
