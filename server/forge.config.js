const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const path = require('path');
const fs = require('fs');

module.exports = {
  packagerConfig: {
    asar: true,
    icon: path.resolve(__dirname, 'src/assets/logo'),  // Without extension, Electron will pick the right one for each platform
    executableName: 'Balanghay Library System',
    appBundleId: 'com.balanghay.library',
    appCategoryType: 'public.app-category.education',
    out: path.resolve(__dirname, 'out'),  // Keep original output directory for consistency
    // Prevent auto-registering protocol handlers which can cause file not found errors
    protocols: [
      {
        name: "Balanghay Library App Protocol",
        schemes: ["balanghay"]
      }
    ],
    // Remove win32metadata from packagerConfig if it exists
    win32metadata: {
      CompanyName: "Balanghay",
      FileDescription: "Balanghay Library System",
      OriginalFilename: "Balanghay Library System.exe",
      ProductName: "Balanghay Library System",
      InternalName: "Balanghay",
    },
    extraResource: [
      path.resolve(__dirname, 'database'),  // Include the database directory as a resource
      path.resolve(__dirname, 'src/assets') // Include assets directory as a resource
    ],
    // Use asar.unpackDir to ensure certain files aren't packed into asar
    asar: {
      unpackDir: '{src/assets,assets,database}' // Include database in unpacked files
    },
    // Ignore unnecessary files to reduce package size
    ignore: [
      /^\/(?!src|node_modules|package\.json|forge\.config\.js)/,
      /^\/src\/(?!assets|config|database|middleware|routes|controllers|models|pages|components|index\.js|api-server\.js|preload\.js|index\.html|bundle\.js|index\.css|favicon\.ico|settings-store\.js)/,
      /\.git/,
      /\.vscode/,
      /\.idea/,
      /node_modules\/\.cache/
    ]
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'balanghay',
        authors: 'Balanghay Team',
        description: 'Balanghay Library Management System',
        setupIcon: path.resolve(__dirname, 'src/assets/logo.ico'),  // Using the ico file for Windows setup
        loadingGif: path.resolve(__dirname, 'src/assets/logo.png'), // Add loading GIF
        // Skip registry entries that might cause issues
        noMsi: true,
        // Don't launch app after installation to avoid immediate errors
        noAutoLaunch: true
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'win32', 'linux'],
      config: {}
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          maintainer: 'Balanghay Team',
          homepage: 'https://github.com/jhonorlantero/Balanghay-Library-Management-System',
          icon: path.resolve(__dirname, 'src/assets/logo.png')
        }
      },
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {
        options: {
          maintainer: 'Balanghay Team',
          homepage: 'https://github.com/jhonorlantero/Balanghay-Library-Management-System',
          icon: path.resolve(__dirname, 'src/assets/logo.png')
        }
      },
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  hooks: {
    // Run before packaging but after all dependencies are installed
    packageAfterPrune: async (forgeConfig, buildPath) => {
      console.log('Preparing package for production...');
      
      // Create assets directory structure
      const directories = [
        path.join(buildPath, 'assets'),
        path.join(buildPath, 'src', 'assets'),
        path.join(buildPath, 'database'),
        path.join(buildPath, 'resources')
      ];
      
      // Ensure directories exist
      directories.forEach(dir => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          console.log(`Created directory: ${dir}`);
        }
      });
      
      // Copy assets to both locations for redundancy
      const assetsToCopy = [
        // Source assets
        {
          src: path.resolve(__dirname, 'src', 'assets', 'logo.png'),
          dests: [
            path.join(buildPath, 'src', 'assets', 'logo.png'),
            path.join(buildPath, 'assets', 'logo.png'),
            path.join(buildPath, 'resources', 'logo.png')
          ]
        },
        {
          src: path.resolve(__dirname, 'src', 'assets', 'logo.ico'),
          dests: [
            path.join(buildPath, 'src', 'assets', 'logo.ico'),
            path.join(buildPath, 'assets', 'logo.ico'),
            path.join(buildPath, 'resources', 'logo.ico')
          ]
        },
        // CSS and other important files
        {
          src: path.resolve(__dirname, 'src', 'index.css'),
          dests: [
            path.join(buildPath, 'src', 'index.css')
          ]
        }
      ];
      
      // Copy database files if they exist
      const dbFiles = fs.readdirSync(path.resolve(__dirname, 'database'));
      dbFiles.forEach(file => {
        assetsToCopy.push({
          src: path.resolve(__dirname, 'database', file),
          dests: [
            path.join(buildPath, 'database', file)
          ]
        });
      });
      
      // Copy all assets
      for (const asset of assetsToCopy) {
        try {
          if (fs.existsSync(asset.src)) {
            for (const dest of asset.dests) {
              fs.copyFileSync(asset.src, dest);
              console.log(`Copied ${asset.src} to ${dest}`);
            }
          } else {
            console.warn(`Warning: Asset not found: ${asset.src}`);
          }
        } catch (err) {
          console.error(`Error copying asset ${asset.src}:`, err);
        }
      }
    },
    // Hook to run before making the distributable
    generateAssets: async () => {
      console.log('Setting NODE_ENV to production for the build...');
      process.env.NODE_ENV = 'production';
    }
  }
};
