try:
    from .runtime import main
except ImportError:  # Allow running this file directly during local debugging.
    from runtime import main  # type: ignore[no-redef]


if __name__ == "__main__":
    raise SystemExit(main())
