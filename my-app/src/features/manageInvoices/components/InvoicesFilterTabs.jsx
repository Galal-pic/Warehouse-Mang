import React from "react";

const InvoicesFilterTabs = ({ filters, selectedIndex, onChange }) => {
  if (!filters || filters.length === 0) return null;

  const visualFilters = [...filters].reverse();
  const count = filters.length;

  return (
    <div className="w-full" dir="rtl">
      <div className="w-full bg-white shadow-md border border-slate-200 py-2">
        
        {/* container */}
        <div
          className="
            flex flex-row-reverse
            gap-2 px-2
            overflow-x-auto
            sm:justify-center
            scrollbar-hide
          "
        >
          {visualFilters.map((filter, idx) => {
            const realIndex = count - 1 - idx;
            const isActive = realIndex === selectedIndex;

            return (
              <button
                key={filter.label}
                type="button"
                onClick={() => onChange(realIndex)}
                className={`
                  whitespace-nowrap
                  px-3 sm:px-4
                  py-1.5 sm:py-2
                  text-xs sm:text-sm
                  font-semibold
                  border border-b-4
                  transition-all duration-200
                  flex-shrink-0
                  ${
                    isActive
                      ? "bg-white text-blue-700 border-blue-600 border-b-blue-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                  }
                `}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default InvoicesFilterTabs;
