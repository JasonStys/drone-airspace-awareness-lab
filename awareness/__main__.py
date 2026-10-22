"""Jason Stys: start trusted local service without remote binding options. Lines: docs/SOURCE_MAP.md."""

import argparse

import uvicorn


def main():
    """Parse a bounded port and start only on loopback with request access logging disabled."""
    parser = argparse.ArgumentParser(description="Synthetic drone airspace awareness; local only")
    parser.add_argument(
        "--port", type=int, default=8871, choices=range(1024, 65536), metavar="PORT"
    )
    args = parser.parse_args()
    uvicorn.run("awareness.app:app", host="127.0.0.1", port=args.port, access_log=False)


if __name__ == "__main__":
    main()
