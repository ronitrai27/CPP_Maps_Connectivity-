# Road Network & Map Navigator (C++ Graph Project)

## How to start (terminal)

```
cd R:\cpp
g++ -std=c++14 main.cpp -o roadmap.exe
.\roadmap.exe
```

## How to use (1 line)

Run `.\roadmap.exe` (PowerShell needs the `.\`), type a menu number (1-13) and press Enter; type city **names or list numbers** when asked. Pick **13** (or run `.\roadmap.exe demo`) to auto-play every feature.

---

## Overview of what I built

A menu-driven terminal program that models a country's roads as a **graph**:

| Graph concept | In this project |
|---|---|
| Vertex | a city (23 Indian cities preloaded) |
| Edge | a two-way road |
| Edge weight | distance in km |
| Storage | adjacency list (`vector<vector<Edge>>`) |

**Features (menu):**
1. Show cities  2. Show road map  3. Shortest route by km (**Dijkstra**)
4. Route with fewest roads (**BFS**)  5. Compare BFS vs Dijkstra on the same trip
6. Distance to all cities (**Dijkstra**)  7. Level-by-level traversal (**BFS**)
8. Connectivity check / separate road networks (**BFS**)
9. Road-closure simulation (detour + "bridge" detection)
10. Add city  11. Add/update road  12. Distance matrix  13. Full auto-demo

The sample map includes two isolated regions (Shimla-Manali, Gangtok-Darjeeling) so judges can see "no route" and "not connected" handled correctly.

**Good demo flow for judges (~2 min):** `13` (auto demo) -> or manually: `2` map -> `8` connectivity -> `5` compare (Delhi -> Mumbai) -> `9` close a road (Delhi-Chandigarh) -> `11` add a road -> `3` route again.

---

## The 2 algorithms

### BFS (Breadth-First Search)
- Uses a **queue**. Starts at a city, visits all neighbours (1 road away), then their neighbours (2 roads away), and so on - level by level.
- Finds the route with the **fewest roads** (ignores km). Works on unweighted graphs.
- Used here for: fewest-stops route, level traversal, "which cities can I reach", and counting **connected components** (separate road networks).
- Complexity: **O(V + E)**.

### Dijkstra's Algorithm
- Uses a **priority queue (min-heap)**. Always expands the unvisited city with the smallest known distance so far, then "relaxes" its neighbours: if `dist[u] + road < dist[v]`, update `dist[v]`.
- Finds the route with the **least total km**. Needs non-negative weights (distances always are).
- Path is rebuilt from a `parent[]` array.
- Used here for: shortest route, distance to all cities, and the detour after a road closure.
- Complexity: **O((V + E) log V)**.

### Why both?
BFS minimises the **number of roads**, Dijkstra minimises the **kilometres**. They can give different answers (option 5 shows e.g. Delhi -> Mumbai: BFS = 3 roads / 1465 km, Dijkstra = 4 roads / 1460 km). That contrast is the key point to tell the examiner.

## Notes
- Written in plain C++ (no external libraries), tested with g++ 6.3 (MinGW) using `-std=c++14`.
- Source: `main.cpp` (single file, easy to read and explain).
