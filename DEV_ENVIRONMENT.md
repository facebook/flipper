# Developer Environment Setup

## Desktop app and Flipper Plugins (Javascript)

The flipper desktop source uses TypeScript and ESLint. Feel free to use your preferred setup, but this is our recommended approach:

**Editor**: Visual Studio Code

**Installed Extensions**:
 * ESLint
 * TypeScript and JavaScript Language Features (enabled by default)

**Settings**:
```json
{
    "javascript.validate.enable": false,
    "eslint.autoFixOnSave": true,
    "eslint.validate": [
        "javascript",
        "javascriptreact",
        "typescript",
        {"language":"typescriptreact", "autoFix": true}
    ],
}
```

## Android plugins and SDK (Java)

**Editor**: Android Studio

## iOS plugins and SDK (Objective-C)

**Editor**: XCode

## Cross-platform SDK (Used by Android and iOS SDK) (C++)

**Editor**: XCode, Android Studio, Visual Studio Code, Vim...
