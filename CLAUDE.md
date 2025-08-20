# CookBookP - React Native Cookbook App

## 🍳 Overview

CookBookP is a React Native application built with Expo and TypeScript for managing ingredients, recipes, and favorites. The app uses SQLite for local data persistence and follows a clean architecture pattern with repositories and hooks.

## 🏗️ Architecture

### Tech Stack
- **Framework**: React Native with Expo
- **Language**: TypeScript
- **Database**: SQLite with expo-sqlite
- **Navigation**: Expo Router
- **State Management**: React Hooks + Context
- **Testing**: Jest + React Native Testing Library


## 🎯 Key Design Principles

- **No Mock Data Outside Tests**: All production code uses real database
- **Type Safety**: Full TypeScript coverage
- **Error Handling**: Comprehensive error management
- **Performance**: Optimized queries and UI rendering
- **User Experience**: Responsive UI with loading states

## ⚡ Pragmatic Programming Rules

### Anti-Overengineering Guidelines

1. **KISS (Keep It Simple, Stupid)**
   - Solve the immediate problem, not hypothetical future problems
   - Choose the simplest solution that works correctly
   - Avoid premature abstraction

2. **YAGNI (You Aren't Gonna Need It)**
   - Don't build features until they're actually needed
   - Remove unused code immediately
   - Focus on current requirements, not speculative ones

3. **DRY Pragmatically**
   - Only abstract after 3+ repetitions
   - Prefer duplication over wrong abstraction
   - Consider maintenance cost vs abstraction benefit

4. **Favor Composition Over Inheritance**
   - Use hooks and functions instead of complex class hierarchies
   - Keep component composition simple and flat
   - Avoid deep nesting of abstractions

### Implementation Standards

1. **File Organization**
   - One main export per file
   - Co-locate related code
   - Avoid deep folder nesting (max 3 levels)

2. **Function Design**
   - Functions should do one thing well
   - Max 20 lines per function (prefer 10-15)
   - Avoid more than 3 parameters

3. **Component Design**
   - Keep components under 150 lines
   - Extract custom hooks for complex logic
   - Props should be obvious and minimal

4. **Error Handling**
   - Fail fast and explicitly
   - Use simple try/catch blocks
   - Don't swallow errors silently

### Decision Framework

When adding new code, ask:
1. **Is this solving a real, current problem?**
2. **Can this be done simpler?**
3. **Will this be easy to understand in 6 months?**
4. **Does this add more value than complexity?**

### Code Review Checklist

- [ ] No premature optimization
- [ ] No speculative features
- [ ] Simple, readable code
- [ ] Minimal abstractions
- [ ] Direct problem solving

**Remember**: Perfect is the enemy of good. Ship working software.

## 🔧 Build Commands

```bash
# Start development server
npm start

# Run tests
npm test

# Type checking
npx tsc --noEmit

# Check for mock violations (MUST pass)
bash scripts/check-no-mocks.sh
```

## 🛡️ Mock Violation Prevention

A validation script (`scripts/check-no-mocks.sh`) automatically checks for mock usage outside tests. This script MUST pass before any commits.

---

*🚨 REMEMBER: Mock data outside tests is absolutely forbidden in this application.*
