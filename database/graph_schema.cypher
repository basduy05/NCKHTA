// Ensure constraints
CREATE CONSTRAINT ON (w:Word) ASSERT w.text IS UNIQUE;
CREATE CONSTRAINT ON (c:Concept) ASSERT c.name IS UNIQUE;

// Example data structure
// (Word)-[:BELONGS_TO]->(Concept)
// (Word)-[:SYNONYM_OF]->(Word)
// (Word)-[:ANTONYM_OF]->(Word)
// (Concept)-[:RELATED_TO]->(Concept)

// Sample Query for inserting a word
// MERGE (w:Word {text: 'artificial'})
// MERGE (c:Concept {name: 'Technology'})
// MERGE (w)-[:BELONGS_TO]->(c);
