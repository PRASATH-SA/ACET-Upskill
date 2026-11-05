/** Sample faculty notes used by the RAG and pipeline tests. */
export const NORMALIZATION_NOTES = `NORMALIZATION

Normalization is the process of organising a relational database to reduce redundancy. We split large tables into smaller tables so that each fact is stored once. Splitting tables removes update, insertion and deletion anomalies.

First Normal Form

A table is in 1NF when every column holds atomic values and there are no repeating groups. Customer phone numbers are split into a separate table instead of a comma separated list.

Second Normal Form

A table is in 2NF when it is in 1NF and no non-key attribute depends on part of a composite key. Partial dependencies are removed by splitting the table on the determinant.

Third Normal Form

A table is in 3NF when it is in 2NF and no non-key attribute depends on another non-key attribute. Transitive dependencies are removed by splitting tables again, so that every table describes one thing. Decomposition must be lossless so the original table can be rebuilt with a join.`;

export const INDEXING_NOTES = `INDEXING

An index is a data structure that speeds up lookups on disk. A B+ tree index keeps keys sorted in balanced pages so a search reads few blocks. Hash indexes give constant time equality lookups but cannot answer range queries. Clustered indexes store rows in key order while secondary indexes point to rows. Too many indexes slow down inserts and updates because each index must be maintained. The query optimiser chooses an index from statistics about selectivity and cost of disk access for every query plan.`;
