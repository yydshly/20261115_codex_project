"""Test only the project's localhost export with an isolated headless browser."""
from pathlib import Path
from itertools import product
from urllib.request import build_opener, ProxyHandler
from urllib.parse import urljoin
import argparse
import json
import os
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
PAGES = ("index", "exploration", "world", "story", "systems", "future", "sources")

def check_home_visuals(browser, base, output):
    results = []
    for width, height in ((1440, 1000), (390, 844)):
        context = browser.new_context(viewport={"width":width,"height":height}, reduced_motion="reduce")
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        response = page.goto(base+"index.html", wait_until="networkidle")
        assert response.status == 200
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1")
        character = page.locator('#character-preview img')
        assert character.get_attribute('src').endswith('highland-ram-character-v1.png')
        assert character.evaluate('img => img.complete && img.naturalWidth === 1536')
        bounds = character.bounding_box()
        assert bounds['y'] >= 0 and bounds['y'] + bounds['height'] <= height + 1, bounds
        assert page.locator('.visual-home-spotlights .image-button').count() == 2
        assert page.locator('.home-image-card').count() == 6
        name = 'desktop' if width > 900 else 'mobile'
        page.screenshot(path=str(output/('home-visuals-'+name+'.png')), full_page=False)
        page.locator('#character-preview [data-lightbox]').click()
        assert page.locator('#lightbox').evaluate('el => el.open')
        assert '岚角族' in page.locator('#lightbox-title').inner_text()
        assert page.locator('#lightbox-download').get_attribute('href').endswith('highland-ram-character-v1.png')
        page.keyboard.press('Escape')
        for aid in ('character','village-v2','region','town-v1','village-v1','reference'):
            card = page.locator('#visual-'+aid)
            image = card.locator('img')
            image.scroll_into_view_if_needed()
            page.wait_for_function('img => img.complete && img.naturalWidth > 0', arg=image.element_handle(), timeout=10000)
            card.locator('[data-lightbox]').click()
            assert page.locator('#lightbox').evaluate('el => el.open')
            assert page.locator('#lightbox-img').get_attribute('src') == image.get_attribute('src')
            page.keyboard.press('Escape')
        if width > 900:
            page.locator('#visuals').scroll_into_view_if_needed()
            page.screenshot(path=str(output/'home-visual-atlas-desktop.png'), full_page=False)
        assert not errors, errors
        results.append({'viewport':f'{width}x{height}','character_fully_visible_in_first_view':True,'hero_images':2,'atlas_images_loaded_and_opened':6,'horizontal_overflow':False,'console_errors':errors})
        context.close()
    record={'date':'2026-11-17','project':ROOT.name,'purpose':'Make character and all concept images directly discoverable on the homepage','checks':results,'original_images_modified':False}
    (output/'home-visuals-report.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'result':'passed','homepage_visual_checks':results}))
    return record

def check_overview(browser, base, output):
    checks = []
    for width, height in ((1440, 1000), (390, 844)):
        context = browser.new_context(viewport={"width":width,"height":height}, reduced_motion="reduce")
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(base+"index.html#overview", wait_until="networkidle")
        preview = page.locator('#overview [data-lightbox="summary"] img')
        preview.scroll_into_view_if_needed()
        page.wait_for_function('img => img.complete && img.naturalWidth === 3200 && img.naturalHeight === 12684', arg=preview.element_handle())
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        assert page.locator('#overview a[download]').count() == 2
        full_link = page.locator('#overview .overview-actions a[target="_blank"]')
        assert full_link.get_attribute('href').endswith('shanhe-understanding-overview-v1.png')
        page.locator('#overview').evaluate("el => el.scrollIntoView({block:'start',behavior:'instant'})")
        page.screenshot(path=str(output/('overview-web-desktop.png' if width > 900 else 'overview-web-mobile.png')))
        page.locator('#overview [data-lightbox="summary"]').click()
        assert page.locator('#lightbox').evaluate('el => el.open')
        assert page.locator('#lightbox-download').get_attribute('href') == preview.get_attribute('src')
        page.keyboard.press('Escape')
        understanding = page.locator('#understanding')
        assert understanding.locator('.understanding-card').count() == 13
        assert understanding.locator('a[href="https://x.com/thorgram/status/2121601256557051920"]').count() == 1
        assert '对我们的创作意义' in understanding.inner_text()
        understanding.evaluate("el => el.scrollIntoView({block:'start',behavior:'instant'})")
        page.screenshot(path=str(output/('understanding-desktop.png' if width > 900 else 'understanding-mobile.png')))
        assert not errors, errors
        checks.append({'viewport':f'{width}x{height}','full_png_dimensions':[3200,12684],'lightbox_and_original_link':True,'horizontal_overflow':False,'console_errors':errors})
        context.close()
    opener = build_opener(ProxyHandler({}))
    resources = ('assets/shanhe-understanding-overview-v1.png','overview-summary.json','assets/overview/board-v1.html','assets/overview/render-record-v1.json')
    for resource in resources:
        with opener.open(urljoin(base,resource),timeout=15) as response:
            assert response.status == 200
            assert response.read(32)
    record = {'date':'2026-11-17','checks':checks,'source_and_output_resources_http_200':len(resources),'original_images_modified':False}
    (output/'overview-web-report.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'result':'passed','overview_viewports':len(checks),'resources':len(resources)}))
    return record


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", default="http://127.0.0.1:52941/20261115_codex_project/demos/0019-shanhe-co-creation/")
    parser.add_argument("--browser", type=Path)
    parser.add_argument("--home-visuals-only", action="store_true")
    parser.add_argument("--overview-only", action="store_true")
    args = parser.parse_args()
    public = args.base == "https://yydshly.github.io/20261115_codex_project/demos/0019-shanhe-co-creation/"
    assert args.base.startswith("http://127.0.0.1:") or public, "QA is limited to loopback or the authorized public project"
    output = REPO/".local/shanhe-qa"
    if public:
        output = output/'public'
    output.mkdir(parents=True, exist_ok=True)
    opener = build_opener(ProxyHandler({}))
    http = {}
    for name in PAGES:
        with opener.open(args.base + name + ".html", timeout=15) as response:
            assert response.status == 200
            http[name] = len(response.read())
    errors, failures, layouts = [], [], []
    with sync_playwright() as p:
        executable = args.browser
        if executable is None:
            runtime = Path(os.environ.get("LOCALAPPDATA", str(Path.home()/"AppData/Local"))) / "ms-playwright"
            candidates = sorted(runtime.glob("chromium_headless_shell-*/chrome-headless-shell-win64/chrome-headless-shell.exe"), key=lambda path: int(path.parents[1].name.rsplit("-",1)[1]))
            executable = candidates[-1] if candidates else Path(p.chromium.executable_path)
        browser = p.chromium.launch(headless=True, executable_path=str(executable))
        if args.overview_only:
            result = check_overview(browser, args.base, output)
            browser.close()
            return result
        if args.home_visuals_only:
            result = check_home_visuals(browser, args.base, output)
            browser.close()
            return result
        context = browser.new_context(viewport={"width":1440,"height":1000}, device_scale_factor=1, reduced_motion="reduce")
        page = context.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("requestfailed", lambda req: failures.append({"url":req.url,"failure":req.failure}))
        for name in PAGES:
            response = page.goto(args.base+name+".html", wait_until="networkidle")
            assert response.status == 200
            assert page.locator("h1").count() == 1
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), "Desktop horizontal overflow: " + name
            layouts.append({"page":name,"viewport":"1440x1000","overflow":False})
            if name in ("index","story","world"):
                page.screenshot(path=str(output/(name+"-desktop.png")), full_page=False)
        page.goto(args.base+"exploration.html", wait_until="networkidle")
        page.locator("#compare-range").focus()
        page.keyboard.press("Home")
        assert page.locator("#compare-value").inner_text() == "0%"
        page.keyboard.press("End")
        assert page.locator("#compare-value").inner_text() == "100%"
        page.locator('[data-filter="rejected"]').click()
        assert page.locator(".asset-entry:visible").count() == 2
        page.locator('[data-filter="kept"]').click()
        assert page.locator(".asset-entry:visible").count() == 3
        page.locator('[data-filter="all"]').click()
        page.locator('[data-lightbox="village-v2"]').click()
        assert page.locator("#lightbox").evaluate("el => el.open")
        assert page.locator("#lightbox-img").evaluate("el => el.complete && el.naturalWidth > 0")
        page.keyboard.press("ArrowRight")
        assert "地区总览" in page.locator("#lightbox-title").inner_text()
        page.wait_for_function("img => img.complete && img.naturalWidth === 1774", arg=page.locator('#lightbox-img').element_handle())
        page.keyboard.press("Escape")
        assert not page.locator("#lightbox").evaluate("el => el.open")
        page.locator(".search-trigger").click()
        page.locator("#archive-search").fill("渡石")
        assert page.locator(".search-result").count() > 0
        page.locator("#archive-search").fill("nonexistent-qazx-archive")
        assert page.locator(".search-result").count() == 0
        page.keyboard.press("Escape")
        page.goto(args.base+"world.html", wait_until="networkidle")
        for i in range(6):
            page.locator(f'[data-district="{i}"]').click()
            assert page.locator(".district-panel:visible").count() == 1
            assert page.locator(f"#district-{i}").is_visible()
        page.goto(args.base+"story.html", wait_until="networkidle")
        page.locator("#font-larger").click()
        page.locator("#font-larger").click()
        assert page.locator("#font-size").inner_text() == "20"
        page.reload(wait_until="networkidle")
        assert page.locator("#font-size").inner_text() == "20"
        page.locator("#focus-reading").click()
        assert page.locator("body").evaluate("el => el.classList.contains('reading-mode')")
        assert not page.locator(".sidebar").is_visible()
        page.locator("#long-rain").evaluate("el => el.scrollIntoView({behavior:'instant',block:'start'})")
        page.wait_for_function("localStorage.getItem('shanhe:reading-section') === 'long-rain'")
        page.screenshot(path=str(output/"story-focus.png"), full_page=False)
        page.goto(args.base+"systems.html", wait_until="networkidle")
        vote_cases = list(product(("ditch","platform","abstain"), repeat=4))
        results = page.evaluate("""cases => cases.map(values => {
          const fields = [...document.querySelectorAll('[data-vote]')];
          values.forEach((value,i) => { fields[i].value = value; fields[i].dispatchEvent(new Event('change',{bubbles:true})); });
          return {values,title:document.querySelector('#vote-result-title').textContent,people:document.querySelectorAll('#personal-positions p').length,explanation:document.querySelector('#vote-explanation').textContent};
        })""", vote_cases)
        for result in results:
            a, b = result["values"].count("ditch"), result["values"].count("platform")
            assert result["title"] == ("临时排水沟" if a>b else "高架货台")
            assert result["people"] == 4 and result["explanation"]
        progress_cases = list(product((False,True),repeat=5))
        progress_results = page.evaluate("""cases => cases.map(values => {
          const fields = [...document.querySelectorAll('[data-progress]'),document.querySelector('#public-complete')];
          values.forEach((value,i) => {fields[i].checked=value;fields[i].dispatchEvent(new Event('change',{bubbles:true}));});
          return {values,unlocked:document.querySelector('#progress-title').dataset.unlocked};
        })""", progress_cases)
        for result in progress_results:
            assert result["unlocked"] == str(all(result["values"][:4])).lower()
        page.goto(args.base+"future.html", wait_until="networkidle")
        page.locator("#local-notes").fill("QA 本机手记")
        page.locator('[data-question="0"]').check()
        page.reload(wait_until="networkidle")
        assert page.locator("#local-notes").input_value() == "QA 本机手记"
        assert page.locator('[data-question="0"]').is_checked()
        with page.expect_download() as download_info:
            page.locator("#export-notes").click()
        download = download_info.value
        notes_path = output/"test-reading-notes.json"
        download.save_as(str(notes_path))
        assert json.loads(notes_path.read_text(encoding="utf-8"))["notes"] == "QA 本机手记"
        context.close()
        mobile = browser.new_context(viewport={"width":390,"height":844},device_scale_factor=1,is_mobile=True,has_touch=True,reduced_motion="reduce")
        mp = mobile.new_page()
        mp.on("pageerror", lambda error: errors.append(str(error)))
        for name in PAGES:
            mp.goto(args.base+name+".html",wait_until="networkidle")
            assert mp.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), "Mobile horizontal overflow: "+name
            layouts.append({"page":name,"viewport":"390x844","overflow":False})
            if name in ("index","story"):
                mp.screenshot(path=str(output/(name+"-mobile.png")),full_page=False)
        mp.goto(args.base+"index.html",wait_until="networkidle")
        mp.locator(".menu-toggle").click()
        assert mp.locator(".menu-toggle").get_attribute("aria-expanded") == "true"
        mp.locator('.nav-item[href="world.html"]').click()
        mp.wait_for_url("**/world.html")
        assert mp.locator("h1").inner_text() == "环境与人物"
        assert not errors, errors
        assert not failures, failures
        browser.close()
    record = {
        "project":ROOT.name,"date":"2026-11-17","mode":"isolated headless browser against authorized public project" if public else "isolated headless browser against localhost only",
        "http_pages":http,"layouts":layouts,"vote_ui_cases":len(vote_cases),"progress_ui_cases":len(progress_cases),
        "interaction_checks":["comparison keyboard 0/100","image filters 2/3/all","lightbox image, next and Escape","Chinese search and no-results","all 6 district tabs","reading font persistence and focus","reading position","local notes persistence and JSON export","mobile navigation"],
        "console_errors":errors,"failed_requests":failures,
        "screenshots":[x.name for x in output.glob("*.png")],
        "game_validation":False,"published":public
    }
    (output/"browser-report.json").write_text(json.dumps(record,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"result":"passed","pages":len(http),"layout_checks":len(layouts),"vote_cases":len(vote_cases),"progress_cases":len(progress_cases),"errors":len(errors),"report":str(output/"browser-report.json")}))
    return record

if __name__=="__main__":
    main()
