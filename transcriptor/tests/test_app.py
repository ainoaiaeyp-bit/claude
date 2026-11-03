import os, time, tempfile
os.environ["TRANSCRIPTOR_ENGINE"] = "fake"
os.environ["TRANSCRIPTOR_DATA"] = tempfile.mkdtemp()
from fastapi.testclient import TestClient
from app.main import app
from app import exporters

c = TestClient(app)


def wait(tid):
    for _ in range(100):
        t = c.get(f"/api/transcripts/{tid}").json()
        if t["status"] in ("done", "error"):
            return t
        time.sleep(0.05)
    raise AssertionError("timeout")


def make():
    r = c.post("/api/transcripts", files=[("files", ("a.mp3", b"xx", "audio/mpeg"))],
               data={"model": "tiny", "word_timestamps": "true"})
    assert r.status_code == 200
    return wait(r.json()["ids"][0])


def test_flow_and_exports():
    t = make()
    assert t["status"] == "done" and len(t["segments"]) == 6 and t["segments"][0]["words"]
    srt = c.get(f"/api/transcripts/{t['id']}/export?format=srt").text
    assert "00:00:00,000 --> 00:00:03,500" in srt
    assert c.get(f"/api/transcripts/{t['id']}/export?format=vtt").text.startswith("WEBVTT")
    assert "[00:04]" in c.get(f"/api/transcripts/{t['id']}/export?format=txt&timestamps=true").text
    for f in exporters.FORMATS:
        assert c.get(f"/api/transcripts/{t['id']}/export?format={f}").status_code == 200
    assert c.get(f"/api/transcripts/{t['id']}/export?format=zzz").status_code == 400


def test_edit_search_delete():
    t = make()
    segs = t["segments"]; segs[0]["text"] = " palabraunica"
    assert c.patch(f"/api/transcripts/{t['id']}", json={"segments": segs}).status_code == 200
    assert any(i["id"] == t["id"] for i in c.get("/api/transcripts?q=palabraunica").json())
    assert c.patch(f"/api/transcripts/{t['id']}", json={"segments": [{"x": 1}]}).status_code == 400
    assert c.delete(f"/api/transcripts/{t['id']}").status_code == 200
    assert c.get(f"/api/transcripts/{t['id']}").status_code == 404


def test_validation_and_summary_off():
    assert c.post("/api/transcripts/url", json={"urls": ["nope"]}).status_code == 400
    r = c.post("/api/transcripts", files=[("files", ("a.mp3", b"x"))], data={"model": "bad"})
    assert r.status_code == 400
    t = make()
    assert c.post(f"/api/transcripts/{t['id']}/summary").status_code == 501
    assert c.get("/").status_code == 200
