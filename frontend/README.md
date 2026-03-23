We worked with multiple datasets:
* NYC Motor Vehicle Collisions - CrashesOver 2 million records (2012–2025) including crash date/time, location, injuries, fatalities, contributing factors, and vehicle types. Raw data contained missing values, outliers, and inconsistencies.
* NYC Motor Vehicle Collisions - Persons / VehiclesRelated datasets integrated via the COLLISION_ID column to provide a richer dataset for analysis.
Data Cleaning and Integration
We performed the following steps:
1. Initial Cleaning of Both Datasets
    * Removed duplicates and irrelevant columns.
    * Standardized formats (dates, strings, categories).
    * Handled missing values: columns with more than 80% missing data were dropped, while remaining missing values were imputed using appropriate methods. (Dropping removes the column entirely; imputation fills missing entries with estimated values.)
2. Integration
    * Merged the datasets using the COLLISION_ID column.
    * After merging, performed post-integration cleaning to resolve new missing values, inconsistencies, and redundant columns.
3. Final Clean Dataset
    * Produced a fully integrated and cleaned dataset ready for analysis and visualization.
Frontend Project
We developed a React-based interactive website to visualize insights from the cleaned dataset. Features include:
* Dropdown filters: Borough, Year, Vehicle Type, Contributing Factor.
* Search mode: Type queries like “Brooklyn 2022 pedestrian crashes” to automatically apply filters.
* Generate Report button: download a pdf file that has a report about the data
* Interactive charts: Bar charts, line charts, heatmaps.
* Dynamic visualizations: All components respond in real-time to user interactions.

Deployment
The website has been deployed using Vercel and is publicly accessible for interactive exploration and reporting:
https://data-visualization-dun.vercel.app/



Contributions

**Ali**  
- Performed data cleaning on both datasets (Crashes and Persons).  
- Contributed to **data integration**
- Conducted post-integration cleaning.  
- Contributed to the React frontend by fixing filter issues that were not working properly.  
- Added the **heatmap** visualization in the report feature.  

**Ramez**  
- Contributed to the data cleaning of the Crashes dataset with some edits, including:  - Contributed to cleaning the Crashes dataset by filling missing boroughs and street names using logical rules and geographic inference, including mode-based imputation for repeated locations, nearest-neighbor filling, and KNN for missing streets.
- Developed the full React frontend project, including all interactive charts, filters, search mode, and the "Generate Report" functionality.

**Omar**  
- Contributed to **data integration** and extracting the final fully cleaned dataset ready for analysis and visualization.
