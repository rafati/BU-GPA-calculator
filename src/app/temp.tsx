// Projected Results Box Component
const ProjectedResultsBox = ({ projectedGPAInfo, editableBaseOverallPoints, editableBaseOverallCredits, editableBaseMajorPoints, editableBaseMajorCredits, calculateGPA }) => {
    return (
        <div className="p-4 rounded-lg border bg-white shadow-sm mt-4">
            <h2 className="text-lg font-medium text-bu-blue border-b pb-2 mb-3 flex items-center justify-between">
                <span className="flex items-center">
                    <span className="mr-2">🎓</span> 
                    Projected Cumulative Results
                </span>
                <div className="text-xs text-gray-500 font-normal">After applying planner changes</div>
            </h2>
            <div className="space-y-3">
                {projectedGPAInfo.status === 'waiting' ? (
                    <p className="text-gray-500 italic">Waiting for data...</p>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 bg-gray-50 p-3 rounded">
                                <h3 className="text-md font-medium">Projected Overall GPA</h3>
                                <p className="text-3xl font-bold text-bu-blue">
                                    {projectedGPAInfo.overallGPA}
                                </p>
                                <div className="text-sm text-gray-600 flex flex-col">
                                    <span>Base: {calculateGPA(parseFloat(editableBaseOverallPoints) || 0, parseInt(editableBaseOverallCredits, 10) || 0)}</span>
                                    <span>Total Credits: {projectedGPAInfo.finalOverallCredits.toFixed(1)}</span>
                                </div>
                            </div>
                            <div className="space-y-2 bg-gray-50 p-3 rounded">
                                <h3 className="text-md font-medium">Projected Major GPA</h3>
                                <p className="text-3xl font-bold text-bu-blue">
                                    {projectedGPAInfo.majorGPA}
                                </p>
                                <div className="text-sm text-gray-600 flex flex-col">
                                    <span>Base: {calculateGPA(parseFloat(editableBaseMajorPoints) || 0, parseInt(editableBaseMajorCredits, 10) || 0)}</span>
                                    <span>Total Credits: {projectedGPAInfo.finalMajorCredits.toFixed(1)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-blue-50 border border-blue-100 p-2 rounded text-xs text-gray-700 mt-2">
                            <p className="italic">
                                These projections combine your base cumulative data with all changes from your planner, 
                                including grade replacements for repeated courses as per university policy.
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// Semester GPA Summary Box Component
const SemesterGPASummaryBox = ({ semesterGPAInfo }) => {
    return (
        <div className="p-4 rounded-lg border bg-white shadow-sm">
            <h2 className="text-lg font-medium text-bu-blue border-b pb-2 mb-3 flex items-center justify-between">
                <span className="flex items-center">
                    <span className="mr-2">📚</span> 
                    Semester Planner Results
                </span>
                <div className="text-xs text-gray-500 font-normal">Based on selected grades</div>
            </h2>
            <div className="space-y-3">
                {semesterGPAInfo.status === 'loading' ? (
                    <p className="text-gray-500 italic">Calculating...</p>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 bg-gray-50 p-3 rounded">
                                <h3 className="text-md font-medium">Semester Overall GPA</h3>
                                <p className="text-3xl font-bold text-green-600">
                                    {semesterGPAInfo.overallGPA}
                                </p>
                                <div className="text-sm text-gray-600">
                                    <span>Credits: {semesterGPAInfo.overallCredits.toFixed(1)}</span>
                                </div>
                            </div>
                            <div className="space-y-2 bg-gray-50 p-3 rounded">
                                <h3 className="text-md font-medium">Semester Major GPA</h3>
                                <p className="text-3xl font-bold text-green-600">
                                    {semesterGPAInfo.majorGPA}
                                </p>
                                <div className="text-sm text-gray-600">
                                    <span>Credits: {semesterGPAInfo.majorCredits.toFixed(1)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-green-50 border border-green-100 p-2 rounded text-xs text-gray-700 mt-2">
                            <p className="italic">
                                Semester GPA calculations include only the current courses in your planner 
                                that have GPA-affecting grades selected.
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
