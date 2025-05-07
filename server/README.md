# Balanghay Library Management System

A modern library management system built with Electron and React.

## Features

- Book management
- Member management
- Loan tracking
- QR code integration
- Shelf organization
- Reporting and statistics

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/jhonorlantero/Balanghay-Library-Management-System.git
   cd Balanghay-Library-Management-System/server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## Building for Production

### Prerequisites

- Node.js 16+ and npm
- Windows: Visual Studio Build Tools for Windows native modules
- Linux: Build essentials (`sudo apt-get install build-essential`)
- macOS: Xcode Command Line Tools

### Build Steps

1. Build the application bundle:
   ```bash
   npm run build
   ```

2. Package the application:
   ```bash
   npm run package
   ```

3. Create distribution files:
   ```bash
   npm run make
   ```

   Or for a specific platform:
   ```bash
   # For Windows
   npm run make:win
   
   # For macOS
   npm run make:mac
   
   # For Linux
   npm run make:linux
   ```

The packaged applications will be in the `out/` directory.

## Configuration

Configuration options are stored in the user's app data folder and can be modified through the settings interface in the application.

## API Server

The application runs an embedded API server on the device's IP address. This allows member client applications to connect to the library system over the local network.

## Database

The SQLite database is stored in:
- Development: `./database/hiraya_balanghay.sqlite`
- Production: `[User App Data]/Balanghay Library System/database/hiraya_balanghay.sqlite`

## License

MIT 