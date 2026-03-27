## 4 Layer Architecture

This project follows a **4-layer architecture** to keep the code modular, maintainable, and scalable.

### 1. UI Layer

Responsible for rendering the user interface.

```
components/
pages/
```

### 2. Hooks Layer
for managing state and api layers

Contains reusable custom React hooks used across the application.

```
hooks/
```

### 3. State Layer

Manages global application state using React Context.

```
context/
 ├── auth.context.jsx
 └── ai.context.jsx
```

### 4. API Layer

Handles communication with backend services and external APIs.

```
services/
 └── auth.api.js
```
