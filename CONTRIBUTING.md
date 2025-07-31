# Contributing to PowerApps Filtered DetailsList

Thank you for your interest in contributing to this project! This document provides guidelines for contributing to the PowerApps Filtered DetailsList PCF control.

## Development Setup

### Prerequisites
- Node.js (v14 or higher)
- PowerApps CLI
- Visual Studio Code (recommended)

### Getting Started
1. Clone the repository
2. Install dependencies: `npm install`
3. Build the project: `npm run build`
4. Start development: `npm start`

## Project Structure

```
DetailsList/
├── components/          # React components
├── services/           # Business logic services
├── types/              # TypeScript type definitions
├── hooks/              # Custom React hooks
├── css/                # Styling
├── __tests__/          # Unit tests
└── __mocks__/          # Test mocks
```

## Development Guidelines

### Code Style
- Follow TypeScript best practices
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Follow React hooks patterns

### Testing
- Write unit tests for new features
- Maintain test coverage above 80%
- Run tests: `npm test`
- Run E2E tests: `npm run test:e2e`

### Performance
- Use React.memo for performance-critical components
- Implement virtualization for large datasets
- Profile performance changes with `npm run analyze`

## Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass: `npm test`
6. Build and verify: `npm run build`
7. Commit with descriptive messages
8. Push to your fork
9. Submit a pull request

## Pull Request Guidelines

- Provide a clear description of the changes
- Include screenshots for UI changes
- Reference any related issues
- Ensure CI checks pass
- Keep PRs focused and atomic

## Reporting Issues

When reporting issues, please include:
- PowerApps environment details
- Browser and version
- Steps to reproduce
- Expected vs actual behavior
- Console errors (if any)

## Questions?

Feel free to open an issue for questions or discussions about the project.
