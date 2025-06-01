# python/tide.py
from pathlib import Path
import argparse
import asyncio
import time

from codetide import CodeTide
from codetide.core.defaults import DEFAULT_SERIALIZATION_PATH

async def init_project(args, force_build: bool = False, flush: bool = False) -> CodeTide:
    storagePath = Path(args.project_path) / DEFAULT_SERIALIZATION_PATH
    try:
        if force_build:
            raise FileNotFoundError()
        
        tide = CodeTide.deserialize(storagePath)
        if flush:
            print(f"[CodeTide][INIT] Initialized from cache: {storagePath}")
    
    except FileNotFoundError:
        st = time.time()
        tide = await CodeTide.from_path(rootpath=args.project_path)
        tide.serialize(storagePath, include_cached_ids=True)
        if flush:
            print(f"[CodeTide][INIT] Fresh parse of {args.project_path}: {len(tide.codebase.root)} files in {time.time()-st:.2f}s")
    return tide

async def handle_get(args):
    tide = await init_project(args)
    result = tide.codebase.get(args.ids, degree=1, as_string=True)
    if result:
        print(result)
    else:
        print(f"[CodeTide][GET] No matches found for {args.ids}")

async def handle_parse(args):
    tide = await init_project(args)
    print(f"[CodeTide][PARSE] File parsed: {args.file_path} in {args.project_path}")
    # Actual parsing logic to be implemented

async def main():
    parser = argparse.ArgumentParser(description="CLI for VSCode Extension")
    subparsers = parser.add_subparsers(dest="command", required=True)

    parser_project = subparsers.add_parser("project", help="Initialize project parser")
    parser_project.add_argument("project_path", help="Path to the current workspace/project")
    parser_project.set_defaults(func=init_project, force_build=True, flush=True)

    parser_get = subparsers.add_parser("get", help="Get one or more items by ID")
    parser_get.add_argument("project_path", help="Path to the current workspace/project")
    parser_get.add_argument("ids", nargs="+", help="List of item IDs to get")
    parser_get.set_defaults(func=handle_get)

    parser_parse = subparsers.add_parser("parse", help="Parse a specific file in the project")
    parser_parse.add_argument("project_path", help="Path to the current workspace/project")
    parser_parse.add_argument("file_path", help="Path to the file to parse")
    parser_parse.set_defaults(func=handle_parse)

    args = parser.parse_args()
    await args.func(args)

if __name__ == "__main__":
    asyncio.run(main())