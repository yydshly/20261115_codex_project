"""Fetch a pinned Three.js runtime and its license, checking npm integrity."""
from pathlib import Path
import base64
import hashlib
import io
import json
import tarfile
from urllib.request import urlopen

VERSION = "0.180.0"
ROOT = Path(__file__).resolve().parents[1]


def main():
    metadata_url = f"https://registry.npmjs.org/three/{VERSION}"
    with urlopen(metadata_url, timeout=30) as response:
        metadata = json.load(response)
    with urlopen(metadata["dist"]["tarball"], timeout=60) as response:
        package = response.read()
    integrity = "sha512-" + base64.b64encode(hashlib.sha512(package).digest()).decode()
    if integrity != metadata["dist"]["integrity"]:
        raise ValueError("Three.js package integrity mismatch")
    output = ROOT / "web" / "vendor" / "three"
    output.mkdir(parents=True, exist_ok=True)
    files = {}
    with tarfile.open(fileobj=io.BytesIO(package), mode="r:gz") as archive:
        for member, name in [("package/build/three.module.min.js", "three.module.min.js"),
                             ("package/build/three.core.min.js", "three.core.min.js"),
                             ("package/examples/jsm/objects/Reflector.js", "Reflector.js"),
                             ("package/LICENSE", "LICENSE")]:
            data = archive.extractfile(member).read()
            (output / name).write_bytes(data)
            files[name] = {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}
    (output / "provenance.json").write_text(json.dumps({
        "package": "three", "version": VERSION, "license": "MIT",
        "repository": "https://github.com/mrdoob/three.js",
        "source": metadata_url, "integrity": integrity, "files": files,
    }, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(f"Vendored Three.js {VERSION}: {sum(f['bytes'] for f in files.values())} bytes")


if __name__ == "__main__":
    main()
