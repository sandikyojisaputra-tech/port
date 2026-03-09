import express from "express";
import path from "path";

async function createServer() {
  const app = express();

  // Mock script data
  const scripts: Record<string, string> = {
    install: `#!/bin/bash
# Pterodactyl Auto Installer Script (with Theme & BG Support)
# Supports VPS & Codespaces
# Usage: bash <(curl -s ...) [theme_url] [bg_image_url]

set -e

THEME_URL=$1
BG_IMAGE_URL=$2

echo "--- Pterodactyl Auto Installer ---"

# Detect Environment
if [ -f /.dockerenv ] || [ "$CODESPACES" = "true" ]; then
    echo "Environment: Codespace/Docker detected"
    ENV_TYPE="codespace"
    
    # Auto-detect Codespace URL
    if [ "$CODESPACES" = "true" ]; then
        # Codespace URLs are usually like: https://NAME-PORT.app.github.dev
        # We want to ensure the panel uses the port 80 URL
        CODESPACE_NAME=$(echo $GITHUB_REPOSITORY | cut -d'/' -f2)
        # Fallback to a generic detection if needed
        DETECTED_URL="https://\${CODESPACE_NAME}-\${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
        echo "Detected Codespace URL base: $DETECTED_URL"
    fi
else
    echo "Environment: VPS/Bare Metal detected"
    ENV_TYPE="vps"
fi

# Basic Dependencies
echo "Installing dependencies..."
if [ "$(id -u)" -ne 0 ]; then
    SUDO="sudo"
else
    SUDO=""
fi

$SUDO apt-get update
$SUDO apt-get install -y curl tar unzip git php-cli php-common php-mbstring php-gd php-xml php-bcmath php-curl

# Docker Install (if needed)
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -sSL https://get.docker.com/ | CHANNEL=stable bash
    if command -v systemctl &> /dev/null; then
        $SUDO systemctl enable --now docker
    fi
fi

# Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    $SUDO curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    $SUDO chmod +x /usr/local/bin/docker-compose
fi

# Panel setup logic
echo "Setting up Pterodactyl Panel..."
if [ "$ENV_TYPE" = "codespace" ]; then
    echo "Configuring for Codespace access..."
    # Auto-detect the URL for port 80
    CS_URL="https://\${CODESPACE_NAME}-80.\${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
    echo "Setting APP_URL to: $CS_URL"
    
    if [ -f ".env" ]; then
        sed -i "s|APP_URL=.*|APP_URL=$CS_URL|" .env
    else
        echo "APP_URL=$CS_URL" >> .env
    fi
fi

echo "Panel setup complete."

# Theme/Background Installation
PTERO_PATH="/var/www/pterodactyl"
if [ ! -d "$PTERO_PATH" ]; then
    PTERO_PATH=$(pwd)
fi

cd "$PTERO_PATH"

if [ ! -z "$THEME_URL" ]; then
    echo "--- Installing Theme ---"
    if [[ "$THEME_URL" == *.sh ]]; then
        echo "Detected theme script, executing..."
        bash <(curl -sL "$THEME_URL")
    else
        echo "Detected theme ZIP, extracting..."
        if [ -d "resources" ]; then
            tar -czf theme_backup_$(date +%F).tar.gz resources/scripts resources/views || true
        fi
        curl -L "$THEME_URL" -o theme.zip
        unzip -o theme.zip
        rm theme.zip
    fi
fi

if [ ! -z "$BG_IMAGE_URL" ]; then
    echo "--- Applying Custom Background ---"
    # Injecting CSS into the main entry point
    CSS_FILE="resources/scripts/index.css"
    if [ -f "$CSS_FILE" ]; then
        echo "body { background-image: url('$BG_IMAGE_URL') !important; background-size: cover !important; background-attachment: fixed !important; }" >> "$CSS_FILE"
    else
        # Fallback for older versions or different structures
        mkdir -p resources/scripts
        echo "body { background-image: url('$BG_IMAGE_URL') !important; background-size: cover !important; background-attachment: fixed !important; }" > "$CSS_FILE"
    fi
fi

# Rebuild assets if theme or background was changed
if [ ! -z "$THEME_URL" ] || [ ! -z "$BG_IMAGE_URL" ]; then
    echo "--- Rebuilding Assets ---"
    export NODE_OPTIONS=--max_old_space_size=4096
    if command -v npm &> /dev/null; then
        npm install
        npm run build:production
    else
        echo "NPM not found, skipping asset build. Please run manually."
    fi
    echo "Theme/Background applied successfully!"
fi

echo "Setup complete. You can now run: docker-compose up -d"
`,
    wings: `# Wings script removed`,
    backup: `# Backup script removed`,
    optimize: `# Optimize script removed`
  };

  let APP_URL = process.env.APP_URL || "";
  
  // Fallback for Vercel environment
  if (!APP_URL && process.env.VERCEL_URL) {
    APP_URL = `https://${process.env.VERCEL_URL}`;
  }
  
  APP_URL = APP_URL.replace(/\/$/, "");

  // API Route to get script list for the UI
  app.get("/api/scripts", (req, res) => {
    res.json({
      scripts: [
        { id: "install", name: "Main Installer", description: "Install Pterodactyl & Docker on VPS/Codespaces", type: "panel" }
      ],
      appUrl: APP_URL
    });
  });

  // API Route for popular themes
  app.get("/api/themes", (req, res) => {
    const baseUrl = APP_URL;
    
    res.json([
      { id: "enigma", name: "Enigma Theme", url: `${baseUrl}/t/enigma.sh`, image: "https://picsum.photos/seed/enigma/400/250" },
      { id: "argon", name: "Argon Theme", url: `${baseUrl}/t/argon.sh`, image: "https://picsum.photos/seed/argon/400/250" },
      { id: "nebula", name: "Nebula Theme", url: `${baseUrl}/t/nebula.sh`, image: "https://picsum.photos/seed/nebula/400/250" },
      { id: "slate", name: "Slate Theme", url: `${baseUrl}/t/slate.sh`, image: "https://picsum.photos/seed/slate/400/250" }
    ]);
  });

  // Theme Script Serving
  app.get("/t/:id.sh", (req, res) => {
    const baseUrl = APP_URL;
    const themeId = req.params.id;

    const script = `#!/bin/bash
echo "--- Installing ${themeId} Theme ---"
cd /var/www/pterodactyl || cd $(pwd)

# Backup
if [ -d "resources" ]; then
    echo "Creating backup..."
    tar -czf theme_backup_$(date +%F).tar.gz resources/scripts resources/views || true
fi

# Download from our own hosted ZIP endpoint
echo "Downloading theme files..."
curl -L "${baseUrl}/t/${themeId}" -o theme.zip
unzip -o theme.zip
rm theme.zip

echo "${themeId} theme files applied."
`;
    res.setHeader("Content-Type", "text/plain");
    res.send(script);
  });

  app.get("/t/:id", async (req, res) => {
    const themeMap: Record<string, string> = {
      enigma: "https://github.com/mubeen-p/Enigma-Theme/archive/refs/heads/main.zip",
      argon: "https://github.com/Argon-Theme/Argon/archive/refs/heads/main.zip",
      nebula: "https://github.com/Nebula-Theme/Nebula/archive/refs/heads/main.zip",
      slate: "https://github.com/Slate-Theme/Slate/archive/refs/heads/main.zip"
    };

    const targetUrl = themeMap[req.params.id];
    if (targetUrl) {
      try {
        const response = await fetch(targetUrl);
        if (!response.ok) throw new Error(`Failed to fetch theme: ${response.statusText}`);
        
        const contentType = response.headers.get("content-type") || "application/zip";
        res.setHeader("Content-Type", contentType);
        res.setHeader("Content-Disposition", `attachment; filename="${req.params.id}.zip"`);
        
        const arrayBuffer = await response.arrayBuffer();
        res.send(Buffer.from(arrayBuffer));
      } catch (error) {
        console.error("Error proxying theme:", error);
        res.status(500).send("Error downloading theme from source");
      }
    } else {
      res.status(404).send("Theme not found");
    }
  });

  // Raw Script Serving for CURL
  app.get("/s/:id", (req, res) => {
    const script = scripts[req.params.id];
    if (script) {
      res.setHeader("Content-Type", "text/plain");
      res.send(script);
    } else {
      res.status(404).send("Script not found");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn("Vite not found, skipping middleware");
    }
  } else {
    // Production static serving (for local testing, Vercel uses vercel.json)
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/s/') || req.path.startsWith('/t/')) {
        return next();
      }
      res.sendFile(path.join(distPath, "index.html"), (err) => {
        if (err) next();
      });
    });
  }

  return app;
}

const appPromise = createServer();

// For local development
if (process.env.NODE_ENV !== "production") {
  appPromise.then(app => {
    const PORT = 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
}

// Export for Vercel
export default async (req: any, res: any) => {
  const app = await appPromise;
  return app(req, res);
};
