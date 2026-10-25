"""Fixed downloaded HTML comparison. Never fetch URLs or execute page scripts."""
import asyncio
import json
import sys
import time
import os
import argparse
from pathlib import Path
from importlib.metadata import version

os.environ.setdefault("CRAWL4AI_NO_CLOUD_NOTICE", "1")
import psutil
import trafilatura
from crawl4ai import AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig
from crawl4ai.async_crawler_strategy import AsyncHTTPCrawlerStrategy


async def main():
    parser = argparse.ArgumentParser(description='Fixed raw HTML comparison. This product includes software developed by UncleCode (https://x.com/unclecode) as part of the Crawl4AI project (https://github.com/unclecode/crawl4ai).')
    parser.add_argument("directory", help="Directory containing fixed samples.json")
    directory = Path(parser.parse_args().directory).resolve()
    samples = json.loads((directory / "samples.json").read_text(encoding="utf-8"))["samples"]
    results = []
    async with AsyncWebCrawler(crawler_strategy=AsyncHTTPCrawlerStrategy(),
                               config=BrowserConfig(ignore_https_errors=False, verbose=False),
                               base_directory=str(directory / "crawl-local")) as crawler:
        for sample in samples:
            raw_path = sample.get("comparisonRawPath")
            if not raw_path:
                results.append({"name": sample["name"], "status": "NO_RAW_INPUT"})
                continue
            html = Path(raw_path).read_text(encoding="utf-8", errors="strict")
            started = time.perf_counter()
            rss_before = psutil.Process().memory_info().rss
            extracted = trafilatura.extract(html, url=sample["url"], output_format="xml", include_tables=True,
                                            include_comments=True, include_links=True, include_formatting=True,
                                            with_metadata=True)
            trafi_ms = round((time.perf_counter() - started) * 1000)
            started = time.perf_counter()
            try:
                output = await asyncio.wait_for(crawler.arun(url="raw:" + html, config=CrawlerRunConfig(
                    base_url=sample["url"], cache_mode=CacheMode.BYPASS, process_in_browser=False,
                    verbose=False, word_count_threshold=1)), timeout=30)
                markdown = output.markdown.raw_markdown if output.markdown else ""
                crawl = {"success": output.success, "error": output.error_message or None,
                         "characters": len(markdown), "markdown": markdown,
                         "links": len(output.links.get("internal", [])) + len(output.links.get("external", [])),
                         "elapsedMs": round((time.perf_counter() - started) * 1000),
                         "scope": "Crawl4AI HTTP raw-HTML pipeline, not browser rendering"}
            except Exception as error:
                crawl = {"success": False, "error": f"{type(error).__name__}: {str(error)[:500]}",
                         "elapsedMs": round((time.perf_counter() - started) * 1000)}
            results.append({"name": sample["name"], "url": sample["url"], "fixedRawPath": raw_path,
                            "trafilatura": {"characters": len(extracted or ""), "xml": extracted,
                                             "elapsedMs": trafi_ms, "status": "EXTRACTED" if extracted else "NO_TEXT"},
                            "crawl4ai": crawl, "rssDeltaBytes": psutil.Process().memory_info().rss - rss_before,
                            "processRssBytes": psutil.Process().memory_info().rss})
    record = {"python": sys.version, "versions": {name: version(name) for name in ["crawl4ai", "trafilatura", "lxml", "playwright"]},
              "scope": "Identical already-downloaded HTML; no browser, new fetches, models, DB or Worker. RSS delta includes allocator retention, not isolated peak memory.",
              "samples": results}
    (directory / "python-comparison.json").write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"directory": str(directory), "versions": record["versions"], "samples": [
        {"name": result["name"], "trafilatura": result.get("trafilatura", {}).get("characters"),
         "crawl4aiSuccess": result.get("crawl4ai", {}).get("success"), "crawl4aiCharacters": result.get("crawl4ai", {}).get("characters"),
         "error": result.get("crawl4ai", {}).get("error")} for result in results]}, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(main())
