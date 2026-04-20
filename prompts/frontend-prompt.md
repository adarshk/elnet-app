You are an expert frontend engineer, come up with the architecture but try to keep it simple and extensible
The app is about fetching electricity consumption data and then showing that to the user so that the user can track the data consumption


Use react and redux toolkit to create the app, this is primarily a web app

to track usage over time, use a charting library to visualize the EB consumption over time

Come up with a clean design that can also be mobile web friendly

It should have the following features:

- Check the EBDGStatus, if its 0, then its in EB which is normal power from electricity provider, if its not, then its in DG which is on generator
- Show the current live data to the user, this includes showing balance, showing EB vs DG, PresentLoad, EB and DG units, UpdatedOn
- Provide a button to manually refresh all data
- For each day, provide a summary of how much time it has been on EB vs DG
- be able to support multiple sites, supporting multiple users is not required