from app.services.communication_ai_service import (
    build_ai_summary_note_fields,
    communication_ref_label,
    communication_ref_marker,
)


def test_communication_ref_marker_uses_chat_kind():
    assert communication_ref_marker("chats", 7) == "communication-ref:chats:7"


def test_communication_ref_label_for_chat_log():
    assert communication_ref_label("chats", "LucyPendellChatLog.md") == "Chat log · LucyPendellChatLog.md"


def test_communication_ref_label_for_call_transcript():
    assert communication_ref_label("transcripts", "intake-call.md") == "Call transcript · intake-call.md"


def test_build_ai_summary_note_fields_includes_summary_and_research_brief():
    fields = build_ai_summary_note_fields(
        kind="chats",
        attachment_id=7,
        filename="LucyPendellChatLog.md",
        summary_text="Lucy wants to talk at 3:30 PM ET and is open to other ships.",
        research_brief="- Follow up: phone call today\n- First cruise together",
    )

    assert fields["summary"] == "✨ AI Summary · Chat log · LucyPendellChatLog.md"
    assert fields["content"].startswith("communication-ref:chats:7")
    assert "## Summary" in fields["content"]
    assert "Lucy wants to talk at 3:30 PM ET" in fields["content"]
    assert "## Research Brief" in fields["content"]
    assert "First cruise together" in fields["content"]
    assert "## Source" in fields["content"]
    assert "- Chat log · LucyPendellChatLog.md" in fields["content"]
