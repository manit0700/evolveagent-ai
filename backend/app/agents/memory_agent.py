from app.services.storage_service import StorageService


class MemoryAgent:
    name = "Memory Agent"

    def __init__(self, storage: StorageService):
        self.storage = storage

    def remember(self, item: dict) -> None:
        self.storage.append("memory.json", item)

    def get_memory(self) -> list[dict]:
        return self.storage.read_list("memory.json")
