// src/pages/RulesetsPage.tsx
import React from 'react';

const RulesetsPage: React.FC = () => {
    return (
        <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Rulesets</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">View and manage DICOM processing rulesets.</p>
             <div className="mt-4 p-4 border border-dashed rounded text-center text-gray-500 dark:text-gray-400">
                 Ruleset list and editor coming soon...
             </div>
        </div>
    );
};

export default RulesetsPage;
