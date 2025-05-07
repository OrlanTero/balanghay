# Balanghay Member Client

An Electron-based client application for members of the Balanghay microfinance system.

## Getting Started

### Prerequisites

- Node.js 14.x or later
- npm 6.x or later

### Installation

1. Clone the repository:
```
git clone https://github.com/yourusername/balanghay.git
cd balanghay/memberclient
```

2. Install dependencies:
```
npm install
```

### Development

To run the application in development mode:

```
npm run dev
```

This will:
1. Build the application with webpack in development mode
2. Start the Electron application

### Production Build

To create a production build:

```
npm run build
npm start
```

## Features

- Server configuration for connecting to the Balanghay backend
- Member login with PIN authentication
- Dashboard for viewing member information
- Real-time updates via Socket.IO
- Material UI-based interface

## Project Structure

- `src/` - Application source code
  - `index.js` - Main Electron process
  - `renderer/` - Renderer process code (React)
  - `components/` - React components
  - `pages/` - Page components
  - `context/` - React context providers
  - `services/` - API and socket services
  - `config/` - Application configuration
  - `assets/` - Images, icons, etc.

## Building for Distribution

To create distributable packages for different platforms:

```
npm run make
```

This will create distributable packages in the `out/` directory.

## License

MIT 