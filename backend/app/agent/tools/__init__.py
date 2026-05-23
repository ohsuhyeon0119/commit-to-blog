import os
from langchain_core.tools import tool


@tool
def list_directory(clone_path: str, subpath: str = "") -> str:
    """List files and directories at a path inside a cloned repo."""
    target = os.path.join(clone_path, subpath)
    if not os.path.exists(target):
        return f"Path not found: {subpath}"
    entries = os.listdir(target)
    return "\n".join(sorted(entries))


@tool
def read_file(clone_path: str, file_path: str) -> str:
    """Read the contents of a file inside a cloned repo."""
    target = os.path.join(clone_path, file_path)
    if not os.path.exists(target):
        return f"File not found: {file_path}"
    try:
        with open(target, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
        if len(content) > 8000:
            content = content[:8000] + "\n...(truncated)"
        return content
    except Exception as e:
        return f"Error reading file: {e}"


@tool
def search_in_repo(clone_path: str, query: str) -> str:
    """Search for a text string across all files in a cloned repo."""
    matches = []
    for root, _, files in os.walk(clone_path):
        for fname in files:
            fpath = os.path.join(root, fname)
            try:
                with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                    for i, line in enumerate(f, 1):
                        if query.lower() in line.lower():
                            rel = os.path.relpath(fpath, clone_path)
                            matches.append(f"{rel}:{i}: {line.rstrip()}")
                            if len(matches) >= 30:
                                return "\n".join(matches)
            except Exception:
                continue
    return "\n".join(matches) if matches else "No matches found."


@tool
def suggest_edit(new_content: str) -> str:
    """블로그 포스트 전체 내용을 새 버전으로 제안합니다. 전체 수정 요청에만 사용하세요."""
    return f"__EDIT_SUGGESTION__{new_content}__END_SUGGESTION__"


@tool
def suggest_partial_edit(replacement_text: str) -> str:
    """에디터에서 선택된 특정 부분만 교체할 때 사용합니다. replacement_text에는 선택된 부분을 대체할 새 텍스트만 넣으세요. 전체 내용이 아닌 선택 부분만 반환하세요."""
    return f"__PARTIAL_EDIT__{replacement_text}__END_PARTIAL__"


FILE_TOOLS = [list_directory, read_file, search_in_repo, suggest_edit, suggest_partial_edit]
