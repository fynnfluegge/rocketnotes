### Create virtual environment
```bash
uv env
```

### Activate virtual environment
```bash
source .venv/bin/activate
```

### Deactivate virtual environment
```bash
deactivate

```

### List installed packages
```bash
uv pip list
```

### Install dependencies
```bash
uv pip install -r pyproject.toml
```

### Run tests
```bash
uv run pytest tests -s
```
