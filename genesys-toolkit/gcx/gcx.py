#!/usr/bin/env python3
"""gcx - Genesys Cloud Platform API helper.

Offline (spec only): find, show, skeleton, validate, perms, refresh-spec
Online (OAuth client credentials): whoami, call, query, job
"""
import argparse
import copy
import datetime as dt
import json
import os
import re
import sys
import time
from pathlib import Path

import jsonschema
import requests

ROOT = Path(__file__).resolve().parent.parent
SPEC_PATH = ROOT / "spec" / "swagger.json"
SPEC_URL = "https://api.mypurecloud.com/api/v2/docs/swagger"
TOKEN_CACHE = Path.home() / ".cache" / "gcx"
METHODS = ("get", "post", "put", "patch", "delete")

REGIONS = {
    "us-east-1": "mypurecloud.com",
    "us-east-2": "use2.us-gov-pure.cloud",
    "us-west-2": "usw2.pure.cloud",
    "ca-central-1": "cac1.pure.cloud",
    "sa-east-1": "sae1.pure.cloud",
    "mx-central-1": "mxc1.pure.cloud",
    "eu-west-1": "mypurecloud.ie",
    "eu-west-2": "euw2.pure.cloud",
    "eu-central-1": "mypurecloud.de",
    "eu-central-2": "euc2.pure.cloud",
    "me-central-1": "mec1.pure.cloud",
    "ap-south-1": "aps1.pure.cloud",
    "ap-northeast-1": "mypurecloud.jp",
    "ap-northeast-2": "apne2.pure.cloud",
    "ap-northeast-3": "apne3.pure.cloud",
    "ap-southeast-1": "apse1.pure.cloud",
    "ap-southeast-2": "mypurecloud.com.au",
}


# ---------------------------------------------------------------- spec

_spec = None


def spec():
    global _spec
    if _spec is None:
        if not SPEC_PATH.exists():
            sys.exit(f"Spec missing at {SPEC_PATH}; run: gcx refresh-spec")
        _spec = json.loads(SPEC_PATH.read_text())
    return _spec


def operations():
    for path, item in spec()["paths"].items():
        for method in METHODS:
            op = item.get(method)
            if op:
                yield method.upper(), path, op


def find_op(ref):
    """Resolve an operationId or 'METHOD /path'."""
    parts = ref.split(None, 1)
    for method, path, op in operations():
        if op.get("operationId", "").lower() == ref.lower():
            return method, path, op
        if len(parts) == 2 and parts[0].upper() == method and parts[1] == path:
            return method, path, op
    sys.exit(f"No operation matches {ref!r}; try: gcx find <keywords>")


def body_schema(op):
    for p in op.get("parameters", []):
        if p.get("in") == "body":
            return p.get("schema")
    return None


def deref(schema):
    ref = schema.get("$ref") if schema else None
    if ref:
        return spec()["definitions"][ref.split("/")[-1]], ref.split("/")[-1]
    return schema, None


def op_permissions(op):
    req = op.get("x-inin-requires-permissions") or {}
    scopes = sorted({s for sec in op.get("security", []) for v in sec.values() for s in v})
    return req.get("type", ""), req.get("permissions", []), scopes


def gc_hint(path):
    segs = [s for s in path.replace("/api/v2/", "").split("/") if not s.startswith("{")]
    return "gc " + " ".join(segs) + " --help"


def cmd_refresh_spec(args):
    SPEC_PATH.parent.mkdir(parents=True, exist_ok=True)
    r = requests.get(SPEC_URL, timeout=120)
    r.raise_for_status()
    SPEC_PATH.write_bytes(r.content)
    d = r.json()
    n = sum(1 for _ in operations())
    print(f"Saved {SPEC_PATH} (API {d['info'].get('version')}, {len(d['paths'])} paths, {n} operations)")


def words(text):
    parts = re.split(r"[^A-Za-z0-9]+", re.sub(r"([a-z])([A-Z])", r"\1 \2", text))
    return {w.lower() for w in parts if w}


def has(term, ws):
    return any(w.startswith(term) for w in ws)


def cmd_find(args):
    terms = [t.lower() for t in args.terms]
    hits = []
    for method, path, op in operations():
        if args.method and method != args.method.upper():
            continue
        tags = " ".join(op.get("tags", [])).lower()
        if args.tag and args.tag.lower() not in tags:
            continue
        hay = {
            "path": words(path),
            "id": words(op.get("operationId", "")),
            "summary": words(op.get("summary") or ""),
            "desc": words(op.get("description") or ""),
            "tags": words(tags),
        }
        matched, score = 0, 0
        for t in terms:
            sc = 3 * has(t, hay["path"]) + 3 * has(t, hay["id"]) + 2 * has(t, hay["summary"]) + has(t, hay["desc"]) + has(t, hay["tags"])
            matched += sc > 0
            score += sc
        if matched == 0:
            continue
        if op.get("deprecated"):
            score -= 5
        hits.append(((matched, score), method, path, op))
    hits.sort(key=lambda h: (-h[0][0], -h[0][1]))
    for score, method, path, op in hits[: args.limit]:
        _, perms, _ = op_permissions(op)
        flags = " [DEPRECATED]" if op.get("deprecated") else ""
        flags += " [PREVIEW]" if op.get("x-genesys-preview") else ""
        print(f"{method:6} {path}{flags}\n       {op.get('operationId')}: {op.get('summary', '')}")
        if perms:
            print(f"       perms: {', '.join(perms)}")
    if not hits:
        print("No matches.")


def cmd_field(args):
    """Search definition property names, descriptions and enum values (metrics, dimensions, ...)."""
    term = args.term.lower()
    seen = set()
    for dname, d in spec()["definitions"].items():
        if args.definition and args.definition.lower() not in dname.lower():
            continue
        for pname, pv in (d.get("properties") or {}).items():
            inner, _ = deref(pv)
            enum = inner.get("enum") or deref(inner.get("items", {}))[0].get("enum") or []
            hits = [e for e in enum if term in str(e).lower()]
            if term in pname.lower() or hits:
                key = (pname, tuple(hits))
                if key in seen and not args.all:
                    continue
                seen.add(key)
                shown = f" enum matches: {', '.join(hits[:20])}" if hits else ""
                print(f"{dname}.{pname}{shown}")


def describe_schema(schema, indent=0, depth=0, max_depth=3, seen=()):
    pad = "  " * indent
    schema, name = deref(schema)
    if name in seen or depth > max_depth:
        print(f"{pad}  … ({name})")
        return
    seen = seen + (name,) if name else seen
    props = schema.get("properties", {})
    required = set(schema.get("required", []))
    for key, val in props.items():
        if val.get("readOnly"):
            continue
        inner, iname = deref(val)
        typ = inner.get("type", iname or "object")
        items = None
        if typ == "array":
            items, items_name = deref(inner.get("items", {}))
            typ = f"array<{items_name or items.get('type', 'object')}>"
        enum = inner.get("enum") or (items or {}).get("enum")
        line = f"{pad}- {key}{' *' if key in required else ''}: {typ}"
        desc = (val.get("description") or inner.get("description") or "").strip().replace("\n", " ")
        if desc:
            line += f" — {desc[:160]}"
        print(line)
        if enum:
            shown = ", ".join(enum[:40]) + (" …" if len(enum) > 40 else "")
            print(f"{pad}    enum: {shown}")
        nxt = items if items and items.get("properties") else (inner if inner.get("properties") else None)
        if nxt is not None and depth < max_depth:
            ref_src = inner.get("items") if items is not None else val
            describe_schema(ref_src, indent + 2, depth + 1, max_depth, seen)


def cmd_show(args):
    method, path, op = find_op(args.op)
    ptype, perms, scopes = op_permissions(op)
    print(f"{method} {path}\noperationId: {op.get('operationId')}\nsummary: {op.get('summary', '')}")
    if op.get("description"):
        print(f"description: {op['description'].strip()[:1500]}")
    if op.get("deprecated"):
        print("DEPRECATED")
    print(f"permissions ({ptype or 'n/a'}): {', '.join(perms) or '-'}\noauth scopes: {', '.join(scopes) or '-'}")
    print(f"cli hint: {gc_hint(path)}")
    params = [p for p in op.get("parameters", []) if p.get("in") != "body"]
    if params:
        print("parameters:")
        for p in params:
            enum = f" enum={p['enum']}" if p.get("enum") else ""
            dflt = f" default={p['default']}" if "default" in p else ""
            print(f"  - {p['name']} ({p['in']}{', required' if p.get('required') else ''}) {p.get('type', '')}{enum}{dflt}: {(p.get('description') or '')[:160]}")
    bs = body_schema(op)
    if bs:
        _, name = deref(bs)
        print(f"request body: {name or 'inline'}  (* = required)")
        describe_schema(bs, max_depth=args.depth)
    ok = op.get("responses", {}).get("200") or op.get("responses", {}).get("202") or {}
    if ok.get("schema"):
        _, name = deref(ok["schema"])
        print(f"response: {name or ok['schema'].get('type')}")


def example_value(schema, depth=0, seen=()):
    schema, name = deref(schema)
    if name in seen or depth > 6:
        return {}
    seen = seen + (name,) if name else seen
    if "enum" in schema:
        return schema["enum"][0]
    typ = schema.get("type", "object")
    if typ == "array":
        return [example_value(schema.get("items", {}), depth + 1, seen)]
    if typ == "object" or "properties" in schema:
        req = schema.get("required", [])
        return {k: example_value(schema["properties"][k], depth + 1, seen) for k in req if k in schema.get("properties", {})}
    fmt = schema.get("format")
    return {"integer": 0, "number": 0, "boolean": False}.get(typ, "<date-time>" if fmt == "date-time" else "<string>")


def cmd_skeleton(args):
    _, _, op = find_op(args.op)
    bs = body_schema(op)
    if not bs:
        sys.exit("Operation has no request body.")
    print(json.dumps(example_value(bs), indent=2))


def strict(node):
    if isinstance(node, dict):
        if "properties" in node and "additionalProperties" not in node:
            node["additionalProperties"] = False
        for v in node.values():
            strict(v)
    elif isinstance(node, list):
        for v in node:
            strict(v)
    return node


def validate_body(op, body, loose=False):
    bs = body_schema(op)
    if not bs:
        return ["Operation has no request body."]
    defs = copy.deepcopy(spec()["definitions"])
    schema = {"definitions": defs, **copy.deepcopy(bs)}
    if not loose:
        strict(schema)
    v = jsonschema.Draft4Validator(schema)
    return [f"{'/'.join(map(str, e.absolute_path)) or '<root>'}: {e.message[:300]}" for e in sorted(v.iter_errors(body), key=lambda e: list(map(str, e.absolute_path)))]


def cmd_validate(args):
    _, _, op = find_op(args.op)
    body = render_body(args.body, args)
    errs = validate_body(op, body, args.loose)
    if errs:
        print("INVALID:\n  " + "\n  ".join(errs))
        sys.exit(1)
    print("OK: body matches the spec")


def cmd_perms(args):
    allp, alls = set(), set()
    for ref in args.ops:
        method, path, op = find_op(ref)
        t, perms, scopes = op_permissions(op)
        print(f"{method} {path}: {t} {perms}")
        allp.update(perms)
        alls.update(scopes)
    print("\nUnion of permissions (grant ANY-type ones selectively):\n  " + "\n  ".join(sorted(allp)))
    print("OAuth scopes:\n  " + "\n  ".join(sorted(alls)))


# ---------------------------------------------------------------- templating

def parse_duration(s):
    m = re.fullmatch(r"(\d+)([mhd])", s)
    if not m:
        sys.exit(f"Bad duration {s!r}; use e.g. 30m, 24h, 7d")
    n, unit = int(m.group(1)), m.group(2)
    return dt.timedelta(minutes=n) if unit == "m" else dt.timedelta(hours=n) if unit == "h" else dt.timedelta(days=n)


def iso(t):
    return t.strftime("%Y-%m-%dT%H:%M:%S.000Z")


def render_body(path_or_json, args):
    text = Path(path_or_json).read_text() if Path(path_or_json).exists() else path_or_json
    vars_ = {}
    now = dt.datetime.now(dt.timezone.utc).replace(microsecond=0)
    if getattr(args, "interval", None):
        vars_["interval"] = args.interval
    else:
        vars_["interval"] = f"{iso(now - parse_duration(getattr(args, 'last', None) or '24h'))}/{iso(now)}"
    for kv in getattr(args, "var", None) or []:
        k, _, v = kv.partition("=")
        vars_[k] = v
    for k, v in vars_.items():
        text = text.replace("{{" + k + "}}", v)
    left = re.findall(r"\{\{(\w+)\}\}", text)
    if left:
        sys.exit(f"Unfilled template vars: {sorted(set(left))}; pass --var name=value")
    return json.loads(text)


# ---------------------------------------------------------------- auth + http

def env_for(org):
    prefix = f"GENESYSCLOUD_{org.upper()}_" if org else "GENESYSCLOUD_"
    region = os.environ.get(prefix + "REGION")
    cid = os.environ.get(prefix + "OAUTHCLIENT_ID")
    secret = os.environ.get(prefix + "OAUTHCLIENT_SECRET")
    missing = [n for n, v in (("REGION", region), ("OAUTHCLIENT_ID", cid), ("OAUTHCLIENT_SECRET", secret)) if not v]
    if missing:
        sys.exit("Missing env: " + ", ".join(prefix + m for m in missing))
    domain = REGIONS.get(region, region).replace("https://", "").replace("api.", "", 1)
    return domain, cid, secret


class Client:
    def __init__(self, org=None):
        self.domain, self.cid, self.secret = env_for(org)
        self.base = f"https://api.{self.domain}"
        self.s = requests.Session()
        self.s.headers["Authorization"] = f"Bearer {self._token()}"
        self.s.headers["Content-Type"] = "application/json"

    def _token(self):
        TOKEN_CACHE.mkdir(parents=True, exist_ok=True)
        cache = TOKEN_CACHE / f"{self.domain}_{self.cid}.json"
        if cache.exists():
            c = json.loads(cache.read_text())
            if c["expires_at"] > time.time() + 300:
                return c["access_token"]
        r = requests.post(f"https://login.{self.domain}/oauth/token", data={"grant_type": "client_credentials"}, auth=(self.cid, self.secret), timeout=30)
        if r.status_code != 200:
            sys.exit(f"Auth failed ({r.status_code}): {r.text[:300]}")
        tok = r.json()
        cache.write_text(json.dumps({"access_token": tok["access_token"], "expires_at": time.time() + tok["expires_in"]}))
        cache.chmod(0o600)
        return tok["access_token"]

    def request(self, method, path, **kw):
        if "://" in path:
            if not path.startswith(self.base + "/"):
                sys.exit(f"Refusing to send the Genesys token to {path}; only {self.base} is allowed")
            url = path
        else:
            url = self.base + path
        for attempt in range(8):
            r = self.s.request(method, url, timeout=120, **kw)
            if r.status_code == 429 or r.status_code >= 500 and attempt < 3:
                wait = int(r.headers.get("Retry-After", 2 ** attempt))
                print(f"[gcx] {r.status_code}, retrying in {wait}s", file=sys.stderr)
                time.sleep(wait)
                continue
            if r.status_code >= 400:
                sys.exit(f"{method} {path} -> {r.status_code}: {r.text[:1000]}")
            return r.json() if r.content else {}
        sys.exit(f"{method} {path}: gave up after retries")

    def paginate(self, path, params):
        params = dict(params)
        params.setdefault("pageSize", 100)
        page = self.request("GET", path, params=params)
        yield from page.get("entities", [])
        while page.get("nextUri"):
            page = self.request("GET", page["nextUri"])
            yield from page.get("entities", [])
        if "cursor" in page:
            while page.get("cursor"):
                params["cursor"] = page["cursor"]
                page = self.request("GET", path, params=params)
                yield from page.get("entities", [])


def emit(data, out):
    text = json.dumps(data, indent=2)
    if out:
        Path(out).parent.mkdir(parents=True, exist_ok=True)
        Path(out).write_text(text)
        n = len(data) if isinstance(data, list) else 1
        print(f"Wrote {out} ({n} records)", file=sys.stderr)
    else:
        print(text)


def emit_stream(rows, out):
    """Write an iterable of records as a JSON array without holding them all in memory.
    If a request fails midway, the file is left as an unterminated array ending in the last complete record."""
    if not out:
        write_array(rows, sys.stdout)
        return
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w") as f:
        n = write_array(rows, f)
    print(f"Wrote {out} ({n} records)", file=sys.stderr)


def write_array(rows, f):
    n = 0
    f.write("[")
    for row in rows:
        f.write(",\n" if n else "\n")
        f.write(json.dumps(row))
        n += 1
    f.write("\n]\n")
    return n


READ_ONLY_POST = re.compile(r"/(query|jobs)$")


def check_read_only(method, path, allow_write):
    if method == "GET" or allow_write or (method == "POST" and READ_ONLY_POST.search(path.split("?")[0])):
        return
    sys.exit(f"{method} {path} can modify the org; gcx is read-only by default. Re-run with --allow-write if intended.")


def cmd_whoami(args):
    c = Client(args.org)
    org = c.request("GET", "/api/v2/organizations/me")
    print(f"Connected: {org.get('name')} ({org.get('id')}) via api.{c.domain}")


def cmd_call(args):
    method = args.method.upper()
    check_read_only(method, args.path, args.allow_write)
    c = Client(args.org)
    params = dict(kv.split("=", 1) for kv in args.param or [])
    if args.paginate:
        emit_stream(c.paginate(args.path, params), args.out)
        return
    body = render_body(args.body, args) if args.body else None
    emit(c.request(method, args.path, params=params, json=body), args.out)


def cmd_query(args):
    """POST a query body; validates against the spec first, pages details queries."""
    method, path, op = find_op(args.op)
    body = render_body(args.body, args)
    errs = validate_body(op, body, args.loose)
    if errs:
        sys.exit("Body fails spec validation:\n  " + "\n  ".join(errs))
    check_read_only(method, path, False)
    c = Client(args.org)
    if path.endswith("/details/query"):
        body.setdefault("paging", {"pageSize": 100, "pageNumber": 1})
        key = "conversations" if "conversations" in path else "userDetails"

        def pages():
            while True:
                res = c.request(method, path, json=body)
                batch = res.get(key, [])
                yield from batch
                print(f"[gcx] page {body['paging']['pageNumber']}: {len(batch)} (total {res.get('totalHits')})", file=sys.stderr)
                if len(batch) < body["paging"]["pageSize"]:
                    break
                body["paging"]["pageNumber"] += 1

        emit_stream(pages(), args.out)
    else:
        emit(c.request(method, path, json=body), args.out)


def cmd_job(args):
    """Async analytics job: submit, poll, collect all result pages."""
    base = f"/api/v2/analytics/{args.kind}/jobs"
    ops = {o.get("operationId"): (m, p, o) for m, p, o in operations() if p == base and m == "POST"}
    _, _, op = next(iter(ops.values()), (None, None, None)) or sys.exit(f"No job endpoint {base}")
    body = render_body(args.body, args)
    errs = validate_body(op, body, args.loose)
    if errs:
        sys.exit("Body fails spec validation:\n  " + "\n  ".join(errs))
    c = Client(args.org)
    job = c.request("POST", base, json=body)
    jid = job["jobId"]
    print(f"[gcx] job {jid} submitted", file=sys.stderr)
    while True:
        st = c.request("GET", f"{base}/{jid}")
        if st.get("state") == "FULFILLED":
            break
        if st.get("state") in ("FAILED", "CANCELLED", "EXPIRED"):
            sys.exit(f"Job {jid} {st.get('state')}: {st.get('errorMessage')}")
        time.sleep(args.poll)
    key = {"conversations/details": "conversations", "users/details": "userDetails"}.get(args.kind, "results")

    def pages():
        cursor = None
        while True:
            res = c.request("GET", f"{base}/{jid}/results", params={"pageSize": 1000, **({"cursor": cursor} if cursor else {})})
            yield from res.get(key, [])
            cursor = res.get("cursor")
            if not cursor:
                break

    emit_stream(pages(), args.out)


# ---------------------------------------------------------------- cli

def main():
    ap = argparse.ArgumentParser(prog="gcx", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    def tmpl(p):
        p.add_argument("--last", help="relative interval ending now for {{interval}}, e.g. 24h, 7d")
        p.add_argument("--interval", help="explicit ISO interval for {{interval}}")
        p.add_argument("--var", action="append", help="template var name=value")
        p.add_argument("--loose", action="store_true", help="allow properties not in the spec")

    def online(p):
        p.add_argument("--org", help="env prefix: GENESYSCLOUD_<ORG>_REGION etc. (default GENESYSCLOUD_*)")
        p.add_argument("--out", help="write JSON to file")

    sub.add_parser("refresh-spec").set_defaults(fn=cmd_refresh_spec)
    p = sub.add_parser("find", help="search endpoints")
    p.add_argument("terms", nargs="+")
    p.add_argument("--tag")
    p.add_argument("--method")
    p.add_argument("--limit", type=int, default=15)
    p.set_defaults(fn=cmd_find)
    p = sub.add_parser("field", help="search schema fields and enum values (metrics, dimensions)")
    p.add_argument("term")
    p.add_argument("--definition", help="restrict to definitions containing this name")
    p.add_argument("--all", action="store_true", help="show duplicates across definitions")
    p.set_defaults(fn=cmd_field)
    p = sub.add_parser("show", help="operation details + body schema")
    p.add_argument("op", help="operationId or 'METHOD /path'")
    p.add_argument("--depth", type=int, default=2)
    p.set_defaults(fn=cmd_show)
    p = sub.add_parser("skeleton", help="minimal valid body (required fields)")
    p.add_argument("op")
    p.set_defaults(fn=cmd_skeleton)
    p = sub.add_parser("validate", help="validate a body/template against the spec")
    p.add_argument("op")
    p.add_argument("body", help="file or inline JSON")
    tmpl(p)
    p.set_defaults(fn=cmd_validate)
    p = sub.add_parser("perms", help="permissions needed for operations")
    p.add_argument("ops", nargs="+")
    p.set_defaults(fn=cmd_perms)

    p = sub.add_parser("whoami", help="test credentials")
    p.add_argument("--org")
    p.set_defaults(fn=cmd_whoami)
    p = sub.add_parser("call", help="raw REST call")
    p.add_argument("method")
    p.add_argument("path")
    p.add_argument("--param", action="append", help="query param k=v")
    p.add_argument("--body")
    p.add_argument("--paginate", action="store_true", help="GET all pages of entities")
    p.add_argument("--allow-write", action="store_true", help="permit PUT/PATCH/DELETE and non-query POSTs")
    tmpl(p)
    online(p)
    p.set_defaults(fn=cmd_call)
    p = sub.add_parser("query", help="validated POST query (auto-pages details queries)")
    p.add_argument("op")
    p.add_argument("body")
    tmpl(p)
    online(p)
    p.set_defaults(fn=cmd_query)
    p = sub.add_parser("job", help="async analytics job (large extracts)")
    p.add_argument("kind", help="e.g. conversations/details, users/details, conversations/aggregates")
    p.add_argument("body")
    p.add_argument("--poll", type=int, default=5)
    tmpl(p)
    online(p)
    p.set_defaults(fn=cmd_job)

    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
