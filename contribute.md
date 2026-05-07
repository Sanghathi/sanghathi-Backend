# Contributing to Sanghathi Backend

Thank you for contributing to Sanghathi Backend.

## Contribution Workflow

1. Fork the repository on GitHub.
2. Clone your fork locally.

```bash
git clone https://github.com/YOUR-USERNAME/Sanghathi-Backend.git
cd Sanghathi-Backend
git remote add upstream https://github.com/Sanghathi/sanghathi-Backend.git
```

3. Install dependencies.

```bash
npm install
```

4. Create a feature branch.

```bash
git checkout -b feature/your-feature-name
```

5. Run the backend and implement your changes.

```bash
npm run dev
```

6. Validate your API changes before opening PR using Postman or Insomnia.

7. Commit with a clear message.

```bash
git commit -m "feat: short description of change"
```

8. Push and open a Pull Request to `main`.

```bash
git push origin feature/your-feature-name
```

## Pull Request Checklist

- Backend starts and runs without errors.
- Input validation and error handling are preserved.
- API changes are documented.
- No unnecessary logs or dead code.
- PR description clearly explains API and model changes.

## Need Help or Have Doubts?

1. Open an issue with title prefix `Question:`.
2. Add endpoint details, payload, and error response.
3. Include reproduction steps and expected output.