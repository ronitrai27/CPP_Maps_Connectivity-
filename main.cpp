// ============================================================
//  ROAD NETWORK & MAP NAVIGATOR  (Graph project: BFS + Dijkstra)
//  - Cities  = vertices
//  - Roads   = weighted, undirected edges (weight = distance in km)
//  - BFS      -> connectivity, reachability, fewest-stops route, components
//  - Dijkstra -> shortest-distance route between two cities
//  Build: g++ -std=c++14 main.cpp -o roadmap.exe
// ============================================================
#include <iostream>
#include <vector>
#include <queue>
#include <map>
#include <string>
#include <algorithm>
#include <climits>
#include <iomanip>
#include <limits>
#include <cctype>

using namespace std;

const int INF = INT_MAX;

struct Edge {
    int to;
    int km;
};

class RoadMap {
public:
    vector<string> names;           // index -> city name
    vector<vector<Edge> > adj;      // adjacency list
    map<string, int> id;            // lowercase name -> index

    static string lower(string s) {
        for (size_t i = 0; i < s.size(); i++) s[i] = (char)tolower((unsigned char)s[i]);
        return s;
    }

    int find(const string& name) const {
        map<string, int>::const_iterator it = id.find(lower(name));
        return it == id.end() ? -1 : it->second;
    }

    int addCity(const string& name) {
        int existing = find(name);
        if (existing != -1) return existing;
        names.push_back(name);
        adj.push_back(vector<Edge>());
        id[lower(name)] = (int)names.size() - 1;
        return (int)names.size() - 1;
    }

    bool hasRoad(int a, int b) const {
        for (size_t i = 0; i < adj[a].size(); i++)
            if (adj[a][i].to == b) return true;
        return false;
    }

    // add (or update) a two-way road
    void addRoad(int a, int b, int km) {
        removeRoad(a, b);
        Edge e1 = {b, km};
        Edge e2 = {a, km};
        adj[a].push_back(e1);
        adj[b].push_back(e2);
    }

    bool removeRoad(int a, int b) {
        bool removed = false;
        for (size_t i = 0; i < adj[a].size(); i++)
            if (adj[a][i].to == b) { adj[a].erase(adj[a].begin() + i); removed = true; break; }
        for (size_t i = 0; i < adj[b].size(); i++)
            if (adj[b][i].to == a) { adj[b].erase(adj[b].begin() + i); break; }
        return removed;
    }

    int roadCount() const {
        int c = 0;
        for (size_t i = 0; i < adj.size(); i++) c += (int)adj[i].size();
        return c / 2;
    }

    // ---------------- BFS ----------------
    // Visits level by level. Returns hop-count (number of roads) from src,
    // and fills parent[] so a path can be rebuilt. -1 = unreachable.
    vector<int> bfs(int src, vector<int>& parent) const {
        int n = (int)names.size();
        vector<int> hops(n, -1);
        parent.assign(n, -1);
        queue<int> q;
        hops[src] = 0;
        q.push(src);
        while (!q.empty()) {
            int u = q.front(); q.pop();
            for (size_t i = 0; i < adj[u].size(); i++) {
                int v = adj[u][i].to;
                if (hops[v] == -1) {
                    hops[v] = hops[u] + 1;
                    parent[v] = u;
                    q.push(v);
                }
            }
        }
        return hops;
    }

    // BFS visiting order (for the traversal demo)
    vector<int> bfsOrder(int src) const {
        vector<int> order;
        vector<bool> seen(names.size(), false);
        queue<int> q;
        seen[src] = true;
        q.push(src);
        while (!q.empty()) {
            int u = q.front(); q.pop();
            order.push_back(u);
            for (size_t i = 0; i < adj[u].size(); i++) {
                int v = adj[u][i].to;
                if (!seen[v]) { seen[v] = true; q.push(v); }
            }
        }
        return order;
    }

    // connected components using repeated BFS
    vector<vector<int> > components() const {
        vector<vector<int> > comps;
        vector<bool> seen(names.size(), false);
        for (size_t s = 0; s < names.size(); s++) {
            if (seen[s]) continue;
            vector<int> comp;
            queue<int> q;
            seen[s] = true;
            q.push((int)s);
            while (!q.empty()) {
                int u = q.front(); q.pop();
                comp.push_back(u);
                for (size_t i = 0; i < adj[u].size(); i++) {
                    int v = adj[u][i].to;
                    if (!seen[v]) { seen[v] = true; q.push(v); }
                }
            }
            comps.push_back(comp);
        }
        return comps;
    }

    // ---------------- Dijkstra ----------------
    // Min-heap on distance. Returns shortest km from src to every city.
    vector<int> dijkstra(int src, vector<int>& parent) const {
        int n = (int)names.size();
        vector<int> dist(n, INF);
        parent.assign(n, -1);
        typedef pair<int, int> P;  // (distance, city)
        priority_queue<P, vector<P>, greater<P> > pq;
        dist[src] = 0;
        pq.push(P(0, src));
        while (!pq.empty()) {
            P top = pq.top(); pq.pop();
            int d = top.first, u = top.second;
            if (d > dist[u]) continue;  // stale entry
            for (size_t i = 0; i < adj[u].size(); i++) {
                int v = adj[u][i].to, w = adj[u][i].km;
                if (dist[u] + w < dist[v]) {
                    dist[v] = dist[u] + w;
                    parent[v] = u;
                    pq.push(P(dist[v], v));
                }
            }
        }
        return dist;
    }

    vector<int> buildPath(const vector<int>& parent, int src, int dst) const {
        vector<int> path;
        for (int v = dst; v != -1; v = parent[v]) path.push_back(v);
        reverse(path.begin(), path.end());
        if (path.empty() || path[0] != src) path.clear();
        return path;
    }

    int pathKm(const vector<int>& path) const {
        int total = 0;
        for (size_t i = 0; i + 1 < path.size(); i++)
            for (size_t j = 0; j < adj[path[i]].size(); j++)
                if (adj[path[i]][j].to == path[i + 1]) { total += adj[path[i]][j].km; break; }
        return total;
    }
};

// ---------------- pretty printing helpers ----------------
void line(char c = '=', int n = 60) { cout << string(n, c) << "\n"; }

void title(const string& t) {
    cout << "\n";
    line('=');
    cout << "  " << t << "\n";
    line('=');
}

string pathString(const RoadMap& m, const vector<int>& path) {
    string s;
    for (size_t i = 0; i < path.size(); i++) {
        if (i) s += " -> ";
        s += m.names[path[i]];
    }
    return s;
}

// ---------------- sample map (India) ----------------
void loadSample(RoadMap& m) {
    struct R { const char* a; const char* b; int km; };
    R roads[] = {
        {"Delhi", "Jaipur", 280},     {"Delhi", "Agra", 233},
        {"Delhi", "Chandigarh", 245}, {"Delhi", "Lucknow", 555},
        {"Agra", "Jaipur", 240},      {"Agra", "Lucknow", 335},
        {"Agra", "Bhopal", 570},      {"Jaipur", "Ahmedabad", 660},
        {"Jaipur", "Udaipur", 395},   {"Udaipur", "Ahmedabad", 260},
        {"Ahmedabad", "Mumbai", 525}, {"Ahmedabad", "Bhopal", 570},
        {"Bhopal", "Nagpur", 350},    {"Bhopal", "Mumbai", 780},
        {"Lucknow", "Varanasi", 320}, {"Varanasi", "Patna", 250},
        {"Patna", "Kolkata", 590},    {"Nagpur", "Hyderabad", 500},
        {"Nagpur", "Raipur", 290},    {"Raipur", "Kolkata", 1000},
        {"Mumbai", "Pune", 150},      {"Pune", "Hyderabad", 560},
        {"Pune", "Bengaluru", 840},   {"Hyderabad", "Bengaluru", 570},
        {"Hyderabad", "Chennai", 625},{"Bengaluru", "Chennai", 350},
        {"Bengaluru", "Kochi", 550},  {"Chennai", "Kochi", 690},
        // an isolated region (no road to the mainland) -> shows disconnected components
        {"Shimla", "Manali", 250},
        {"Gangtok", "Darjeeling", 100}
    };
    for (size_t i = 0; i < sizeof(roads) / sizeof(roads[0]); i++) {
        int a = m.addCity(roads[i].a);
        int b = m.addCity(roads[i].b);
        m.addRoad(a, b, roads[i].km);
    }
}

// ---------------- features ----------------
void showCities(const RoadMap& m) {
    title("CITIES (" + to_string(m.names.size()) + ")");
    for (size_t i = 0; i < m.names.size(); i++)
        cout << "  " << setw(2) << i + 1 << ". " << m.names[i] << "\n";
}

void showMap(const RoadMap& m) {
    title("ROAD MAP  (" + to_string(m.names.size()) + " cities, " + to_string(m.roadCount()) + " roads)");
    for (size_t i = 0; i < m.names.size(); i++) {
        cout << left << setw(12) << m.names[i] << " : ";
        if (m.adj[i].empty()) cout << "(no roads)";
        for (size_t j = 0; j < m.adj[i].size(); j++) {
            if (j) cout << ", ";
            cout << m.names[m.adj[i][j].to] << "(" << m.adj[i][j].km << " km)";
        }
        cout << "\n";
    }
}

void showMatrix(const RoadMap& m) {
    title("DISTANCE MATRIX (direct roads, km)");
    int n = (int)m.names.size();
    cout << setw(11) << " ";
    for (int j = 0; j < n; j++) cout << setw(5) << m.names[j].substr(0, 4);
    cout << "\n";
    for (int i = 0; i < n; i++) {
        cout << left << setw(11) << m.names[i] << right;
        for (int j = 0; j < n; j++) {
            int w = 0;
            for (size_t k = 0; k < m.adj[i].size(); k++)
                if (m.adj[i][k].to == j) w = m.adj[i][k].km;
            if (w) cout << setw(5) << w; else cout << setw(5) << ".";
        }
        cout << "\n";
    }
    cout << left;
}

void doShortestRoute(const RoadMap& m, int a, int b) {
    title("DIJKSTRA: SHORTEST DISTANCE  " + m.names[a] + " -> " + m.names[b]);
    vector<int> parent;
    vector<int> dist = m.dijkstra(a, parent);
    if (dist[b] == INF) {
        cout << "  No road connection exists between these cities.\n";
        return;
    }
    vector<int> path = m.buildPath(parent, a, b);
    cout << "  Route    : " << pathString(m, path) << "\n";
    cout << "  Distance : " << dist[b] << " km\n";
    cout << "  Stops    : " << path.size() - 2 << " intermediate\n\n";
    cout << "  Leg by leg:\n";
    for (size_t i = 0; i + 1 < path.size(); i++) {
        vector<int> leg(path.begin() + i, path.begin() + i + 2);
        cout << right << "    " << setw(12) << m.names[path[i]] << " -> " << setw(12) << m.names[path[i + 1]]
             << " " << setw(5) << m.pathKm(leg) << " km\n";
    }
}

void doFewestStops(const RoadMap& m, int a, int b) {
    title("BFS: FEWEST ROADS  " + m.names[a] + " -> " + m.names[b]);
    vector<int> parent;
    vector<int> hops = m.bfs(a, parent);
    if (hops[b] == -1) {
        cout << "  No road connection exists between these cities.\n";
        return;
    }
    vector<int> path = m.buildPath(parent, a, b);
    cout << "  Route    : " << pathString(m, path) << "\n";
    cout << "  Roads    : " << hops[b] << " (hops)\n";
    cout << "  Distance : " << m.pathKm(path) << " km  (not necessarily the shortest!)\n";
}

void doCompare(const RoadMap& m, int a, int b) {
    title("COMPARE BFS vs DIJKSTRA  " + m.names[a] + " -> " + m.names[b]);
    vector<int> pb, pd;
    vector<int> hops = m.bfs(a, pb);
    vector<int> dist = m.dijkstra(a, pd);
    if (hops[b] == -1) { cout << "  Not connected.\n"; return; }
    vector<int> bp = m.buildPath(pb, a, b), dp = m.buildPath(pd, a, b);
    cout << "  BFS      (fewest roads) : " << pathString(m, bp) << "\n"
         << "                            " << bp.size() - 1 << " roads, " << m.pathKm(bp) << " km\n";
    cout << "  Dijkstra (least km)     : " << pathString(m, dp) << "\n"
         << "                            " << dp.size() - 1 << " roads, " << dist[b] << " km\n";
    if (bp == dp) cout << "  -> Both algorithms found the same route here.\n";
    else          cout << "  -> Different routes: BFS minimises roads, Dijkstra minimises km.\n";
}

void doBfsTraversal(const RoadMap& m, int a) {
    title("BFS TRAVERSAL FROM " + m.names[a] + "  (level by level)");
    vector<int> parent;
    vector<int> hops = m.bfs(a, parent);
    int maxLevel = 0;
    for (size_t i = 0; i < hops.size(); i++) maxLevel = max(maxLevel, hops[i]);
    for (int lvl = 0; lvl <= maxLevel; lvl++) {
        cout << "  Level " << lvl << " (" << lvl << " road" << (lvl == 1 ? "" : "s") << "): ";
        bool first = true;
        vector<int> order = m.bfsOrder(a);
        for (size_t i = 0; i < order.size(); i++)
            if (hops[order[i]] == lvl) {
                if (!first) cout << ", ";
                cout << m.names[order[i]];
                first = false;
            }
        cout << "\n";
    }
    int reach = (int)m.bfsOrder(a).size() - 1;
    cout << "\n  Reachable cities : " << reach << " of " << m.names.size() - 1 << "\n";
    vector<string> lost;
    for (size_t i = 0; i < hops.size(); i++)
        if (hops[i] == -1) lost.push_back(m.names[i]);
    if (!lost.empty()) {
        cout << "  Unreachable      : ";
        for (size_t i = 0; i < lost.size(); i++) cout << (i ? ", " : "") << lost[i];
        cout << "\n";
    }
}

void doAllDistances(const RoadMap& m, int a) {
    title("DIJKSTRA: DISTANCE FROM " + m.names[a] + " TO ALL CITIES");
    vector<int> parent;
    vector<int> dist = m.dijkstra(a, parent);
    vector<pair<int, int> > rows;
    for (size_t i = 0; i < dist.size(); i++)
        if ((int)i != a) rows.push_back(make_pair(dist[i], (int)i));
    sort(rows.begin(), rows.end());
    for (size_t i = 0; i < rows.size(); i++) {
        int v = rows[i].second;
        cout << "  " << left << setw(12) << m.names[v] << right;
        if (dist[v] == INF) { cout << "   unreachable\n"; continue; }
        cout << setw(6) << dist[v] << " km   via " << pathString(m, m.buildPath(parent, a, v)) << "\n";
    }
    cout << left;
}

void doConnectivity(const RoadMap& m) {
    title("CONNECTIVITY CHECK (BFS components)");
    vector<vector<int> > comps = m.components();
    cout << "  Separate road networks : " << comps.size() << "\n";
    for (size_t i = 0; i < comps.size(); i++) {
        cout << "  Network " << i + 1 << " (" << comps[i].size() << " cities): ";
        for (size_t j = 0; j < comps[i].size(); j++)
            cout << (j ? ", " : "") << m.names[comps[i][j]];
        cout << "\n";
    }
    if (comps.size() == 1) cout << "\n  RESULT: Fully connected - every city can reach every other.\n";
    else cout << "\n  RESULT: NOT fully connected - some cities have no road link between them.\n";
}

void doClosure(RoadMap& m, int a, int b) {
    title("ROAD CLOSURE SIMULATION  " + m.names[a] + " <-> " + m.names[b]);
    if (!m.hasRoad(a, b)) { cout << "  No direct road between these cities.\n"; return; }
    int km = 0;
    for (size_t i = 0; i < m.adj[a].size(); i++) if (m.adj[a][i].to == b) km = m.adj[a][i].km;
    size_t before = m.components().size();
    m.removeRoad(a, b);
    cout << "  Road closed (" << km << " km).\n";
    vector<int> parent;
    vector<int> dist = m.dijkstra(a, parent);
    if (dist[b] == INF)
        cout << "  No alternate route! These two cities are now cut off.\n";
    else
        cout << "  Detour via Dijkstra : " << pathString(m, m.buildPath(parent, a, b))
             << " (" << dist[b] << " km, was " << km << " km)\n";
    size_t after = m.components().size();
    cout << "  Networks: " << before << " -> " << after
         << (after > before ? "   (this road was a BRIDGE - closing it splits the map!)" : "") << "\n";
    cout << "  (Use option 'Add road' to reopen it.)\n";
}

// ---------------- input helpers ----------------
string readLine(const string& prompt) {
    cout << prompt;
    string s;
    getline(cin, s);
    size_t b = s.find_first_not_of(" \t\r\n"), e = s.find_last_not_of(" \t\r\n");
    return b == string::npos ? "" : s.substr(b, e - b + 1);
}

int readCity(const RoadMap& m, const string& prompt) {
    for (;;) {
        string s = readLine(prompt);
        if (s.empty()) return -1;
        bool digits = true;
        for (size_t i = 0; i < s.size(); i++) if (!isdigit((unsigned char)s[i])) digits = false;
        if (digits) {
            int k = atoi(s.c_str());
            if (k >= 1 && k <= (int)m.names.size()) return k - 1;   // accept list number
        }
        int c = m.find(s);
        if (c != -1) return c;
        cout << "  City not found. Type a name or number from the list (Enter = cancel).\n";
    }
}

int readInt(const string& prompt) {
    for (;;) {
        string s = readLine(prompt);
        if (!s.empty() && s.find_first_not_of("0123456789") == string::npos) return atoi(s.c_str());
        cout << "  Please enter a positive number.\n";
    }
}

void menu() {
    cout << "\n";
    line('-');
    cout << "  MAIN MENU\n";
    line('-');
    cout << "   1. Show all cities\n"
         << "   2. Show road map (adjacency list)\n"
         << "   3. Shortest route by distance        [Dijkstra]\n"
         << "   4. Route with fewest roads           [BFS]\n"
         << "   5. Compare BFS vs Dijkstra\n"
         << "   6. Distance to ALL cities from one   [Dijkstra]\n"
         << "   7. Level-by-level traversal          [BFS]\n"
         << "   8. Check road connectivity           [BFS]\n"
         << "   9. Simulate road closure\n"
         << "  10. Add city\n"
         << "  11. Add / update road\n"
         << "  12. Distance matrix\n"
         << "  13. Run full auto-demo\n"
         << "   0. Exit\n";
    line('-');
}

void autoDemo(RoadMap& m) {
    cout << "\n  >>> AUTO DEMO: running every feature on the sample map <<<\n";
    showMap(m);
    doConnectivity(m);
    doBfsTraversal(m, m.find("Delhi"));
    doShortestRoute(m, m.find("Delhi"), m.find("Kochi"));
    doFewestStops(m, m.find("Delhi"), m.find("Kochi"));
    doCompare(m, m.find("Jaipur"), m.find("Mumbai"));
    doAllDistances(m, m.find("Delhi"));
    doShortestRoute(m, m.find("Delhi"), m.find("Manali"));   // unreachable case
    RoadMap copy = m;                                         // closure on a copy so map stays intact
    doClosure(copy, m.find("Ahmedabad"), m.find("Mumbai"));
    doClosure(copy, m.find("Delhi"), m.find("Chandigarh"));
    cout << "\n  >>> END OF DEMO <<<\n";
}

int main(int argc, char** argv) {
    RoadMap m;
    loadSample(m);

    cout << "\n";
    line('*');
    cout << "   ROAD NETWORK & MAP NAVIGATOR\n"
         << "   Graph project  |  BFS + Dijkstra  |  C++\n";
    line('*');

    if (argc > 1 && string(argv[1]) == "demo") {   
        autoDemo(m);
        return 0;
    }

    for (;;) {
        menu();
        string choice = readLine("  Enter choice: ");
        if (!cin) break;
        int c = choice.empty() ? -1 : atoi(choice.c_str());
        if (choice == "0") { cout << "\n  Goodbye!\n"; break; }

        if (c == 1) showCities(m);
        else if (c == 2) showMap(m);
        else if (c == 3 || c == 4 || c == 5) {
            showCities(m);
            int a = readCity(m, "  From city (name or number): "); if (a < 0) continue;
            int b = readCity(m, "  To city   (name or number): "); if (b < 0) continue;
            if (a == b) { cout << "  Source and destination are the same.\n"; continue; }
            if (c == 3) doShortestRoute(m, a, b);
            else if (c == 4) doFewestStops(m, a, b);
            else doCompare(m, a, b);
        }
        else if (c == 6 || c == 7) {
            showCities(m);
            int a = readCity(m, "  Start city (name or number): "); if (a < 0) continue;
            if (c == 6) doAllDistances(m, a); else doBfsTraversal(m, a);
        }
        else if (c == 8) doConnectivity(m);
        else if (c == 9) {
            showCities(m);
            int a = readCity(m, "  Road from city: "); if (a < 0) continue;
            int b = readCity(m, "  Road to city  : "); if (b < 0) continue;
            doClosure(m, a, b);
        }
        else if (c == 10) {
            string n = readLine("  New city name: ");
            if (n.empty()) continue;
            if (m.find(n) != -1) cout << "  City already exists.\n";
            else { m.addCity(n); cout << "  Added city '" << n << "'.\n"; }
        }
        else if (c == 11) {
            showCities(m);
            int a = readCity(m, "  Road from city: "); if (a < 0) continue;
            int b = readCity(m, "  Road to city  : "); if (b < 0) continue;
            if (a == b) { cout << "  Cannot connect a city to itself.\n"; continue; }
            int km = readInt("  Distance in km: ");
            m.addRoad(a, b, km);
            cout << "  Road saved: " << m.names[a] << " <-> " << m.names[b] << " (" << km << " km).\n";
        }
        else if (c == 12) showMatrix(m);
        else if (c == 13) { RoadMap fresh; loadSample(fresh); autoDemo(fresh); }
        else cout << "  Invalid choice, try again.\n";
    }
    return 0;
}
