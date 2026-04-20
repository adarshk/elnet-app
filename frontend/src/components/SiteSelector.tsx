import { useAppDispatch, useAppSelector } from "../store/hooks";
import { toggleSiteSelection, selectAllSites, deselectAllSites, fetchSites } from "../store/slices/siteSlice";
import { useEffect } from "react";

export default function SiteSelector() {
  const dispatch = useAppDispatch();
  const { sites, selectedSiteIds } = useAppSelector((state) => state.site);

  useEffect(() => {
    dispatch(fetchSites());
  }, [dispatch]);

  if (sites.length === 0) return null;

  const allSelected = selectedSiteIds.length === sites.length;

  return (
    <div className="site-selector">
      <label>Sites: </label>
      {sites.length > 1 && (
        <button
          className="btn btn-sm"
          onClick={() => dispatch(allSelected ? deselectAllSites() : selectAllSites())}
        >
          {allSelected ? "Deselect All" : "Select All"}
        </button>
      )}
      <div className="site-checkboxes">
        {sites.map((site) => (
          <label key={site.id} className="site-checkbox-label">
            <input
              type="checkbox"
              checked={selectedSiteIds.includes(site.id)}
              onChange={() => dispatch(toggleSiteSelection(site.id))}
            />
            <span>{site.name || site.api_base_url}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
