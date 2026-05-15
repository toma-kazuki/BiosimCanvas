# The Core Problem 1: "The Transparency Gap"

The current UI is functionally "rigid" and confusing for designers. It is unclear whether the modules in the CATALOG are Fixed Assets (static stamps) or Abstract Classes (extensible logic).
- Ambiguity: Users don't know if they can rename a module to change its function or if they are strictly bound by the "Catalog" labels.
- Logic Obscurity: The underlying physical logic (e.g., "This module consumes $H_2O$ and produces $O_2$") is hidden from the UI, making it hard to design custom or experimental life support systems.

## Your Task: Investigation and Roadmap
I need you to act as a bridge between the BioSim Simulator Logic and the BioSimCanvas UI. Please execute the following workflow:

### Phase 1: Internal Logic Investigation (The "Source of Truth")
1. XML Schema Audit: Analyze the .biosim XML structure. Identify how the simulator maps XML tags to internal Java/C++ class
2. Class Hierarchy Mapping: Determine the "Base Classes" for modules. For example, is there a GenericConverter class that OGS and VCCR inherit from?
3. Interface Discovery: Identify the "Ports" (Inputs/Outputs) for each module. What resources (Power, Water, Air, etc.) does each class technically require versus what the UI visually shows?

### Phase 2: Identifying "Flexibility Ceilings"
1. Hardcoded vs. Dynamic: Determine if the simulator allows "Custom Modules" defined via parameters, or if it only recognizes hardcoded IDs.
2. Parameter Transparency: Identify which attributes (e.g., vol, cap, flowRate) are globally applicable across all classes and which are unique to specific components.

### Phase 3: Proposed UI/UX Refactoring (The Solution)
Based on your findings, design a plan to upgrade BioSimCanvas from a "Stamping Tool" to a "System Architect Tool":

- Class-Based Catalog: How can we redesign the Catalog to show the functional nature of a module (e.g., "Air Scrubber Class") rather than just a 2-letter acronym?
- Dynamic Interface UI: Propose a way to visually display "Input/Output requirements" when a module is selected, allowing users to see the "Logic Flow" before they even connect wires.
- Custom Class Creation: Design a workflow where a user can take a "Base Class," rename it, and modify its consumption/production coefficients to create a "New Module Type" without leaving the tool.

# The Core Problem 2: "The Hidden Physics Gap"
The current tool (BioSimCanvas) only visualizes what is written in the .biosim XML file. However, the XML does not contain the Transfer Logic (how resources move between modules).
- The Problem: When a user adds a Framework/Injector between a Water Store and a Crew Group, they have no way of knowing how that Injector operates. Is it a pump? A valve? Does it have an internal PID controller?
- The Consequence: Designing a system feels like guesswork because the "Physics Rules" are hidden in the simulator's backend source code (Java/C++), not in the configuration file.

## Your Task: Investigation and System-Aware UI Enhancement

### Phase 1: Backend Logic Extraction (Reverse Engineering)
1. Analyze the Injector and Flow Classes: Go into the BioSim simulator source code. Identify the specific logic for Injector, VCCR, and OGS.
    - How is the flowRate calculated?
    - What are the priority rules when multiple consumers pull from one source?
    - Are there hidden "Operational Modes" (e.g., Idle vs. Active) that aren't in the XML?
2. Define "Functional Contracts": For every module in the CATALOG, create a technical summary of its Input/Output behavior.
    - Example: "Injector: Pulls $X$ amount of gas/liquid per tick if downstream pressure is $< Y$."

### Phase 2: UI/UX Implementation (Surfacing the Logic)I need you to implement a way for users to understand this hidden logic while they are designing. Propose and implement:
1. Logic-Aware Tooltips/Pop-ups:
    - When hovering over an Injector in the Catalog or Canvas, show a "Functional Summary" (e.g., "This module acts as a one-way flow controller. It requires Power to transfer $O_2$ from a Store to an Environment.").
2. Visual "Flow Contracts":
    - When a connection (wire) is made, the UI should validate it based on the backend logic. (e.g., if a user connects a gas store to a liquid-only port, highlight the error).
3. Integrated "Physics Manual":
    - Create a "Module Encyclopedia" tab or sidebar within the frontend that pulls documentation directly from your backend analysis. This should explain the mathematical models used for each module.
4. meter-Logic Sync:
    - If a module has a maxFlowRate parameter, the UI should explain exactly how that number affects the simulation (e.g., "Set to 10.0 to limit transfer to 10kg/hour").