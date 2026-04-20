from neo4j import AsyncGraphDatabase
from config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD

_driver = None

def get_driver():
    global _driver
    if _driver is None:
        try:
            _driver = AsyncGraphDatabase.driver(
                NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD)
            )
        except Exception:
            return None
    return _driver

async def run_query(cypher: str, params: dict = None):
    driver = get_driver()
    if not driver:
        return []
    async with driver.session() as session:
        result = await session.run(cypher, params or {})
        return [record.data() async for record in result]