# projects_db.json: InfraVis projects and node collaboration

Fetched 2026-11-27 from infravis.se through the WordPress REST API
(`/wp-json/wp/v2/posts?categories=581,582,635&per_page=100`). The categories are
`project-mid-level` (581) and `project-in-depth` (582), which make up the support
projects, and `project-internal` (635), which holds the development projects. The
query returned 43 posts (36 support, 7 development). These match exactly the post
links on /projects/projects/ and /projects/internal-projects/, and neither listing
paginates.

## Fields
- `id` is the post slug. `year`/`date` are the WordPress post date. `type` is
  `support` or `development` (category 635).
- `nodes`: the InfraVis nodes that did the work. `node_evidence[node]` gives the
  first source that supplied each node, checked in this order:
  1. `tag`: the post carries a university tag (Chalmers 118, KTH 130, LiU 132/597/737,
     LnU 131, LU 120, MiUn 172, UmU 123, GU 129, UU 128).
  2. `text`: an affiliation code written in the page's *Application Expert* or
     *Node Coordinator* field, for example "Liang Zhou (MiUn)". This also covers an
     "InfraVis Nodes" field or the institution line under the title on 2023 posts.
  3. `people`: an expert or coordinator with no stated affiliation, looked up in
     `assets/portraits/people.json`. If the person is not in that file, their
     affiliation comes from what other InfraVis project pages state for them.
     `node_evidence_detail` records which of the two applied.
- `users`: the home institutions of the researchers. A value is a node id when the
  institution is one of the nine nodes, otherwise the institution name. When the
  page gives no affiliation, I filled it in by hand from context or general
  knowledge and set `users_inferred: true`.
- `domain`, `technique`, `summary` were written by hand from the page. `image` is
  the post's featured image.
- `edges`: for every pair of nodes, `weight` is the number of projects where both
  appear in `nodes` ∪ (`users` that are nodes), and `projects` lists those projects.
  `node_counts` counts the projects involving each node, using the same union.

## Caveats
- University tags are applied inconsistently. Some posts have none, and a tag can
  name the user's institution rather than a node that did work. For example,
  GenomeLens is tagged GU and nothing on the page explains why.
- people.json holds *current* affiliations. Mario Romero (now LiU) was the KTH
  coordinator in 2023–24, and Kostiantyn Kucher (now LiU) was at LnU then. Both are
  overridden to their affiliation at the time.
- Some experts could not be placed at all (Jaume Nualart, Matteo Tomasini, Ahmad
  Abdou, Anders Sjöström, Oscar Ivarsson). The nodes on those projects therefore
  rest on the other people listed.
- Research institutes such as MAX IV, LINXS and QIM are kept as text. They do not
  count as LU, even though Lund hosts them.
- Users mostly come from a single node. Most edges therefore come from multi-node
  expert teams or from users at a different node than the experts, so weights are
  small and many pairs never occur.
- Two projects have no identifiable user: darkness-matters (an independent
  filmmaker) and viamd (internal software).
