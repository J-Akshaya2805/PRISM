import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import LandingPage from './LandingPage';
import DataUpload from './DataUpload';
import DataOverview from './DataOverview';
import InsightsDashboard from './InsightsDashboard';
import DecisionCenter from './DecisionCenter';
import EvidenceModal from './EvidenceModal';
import AskPrism from './AskPrism';

export default function App() {
  const [activeTab, setActiveTab] = useState('landing');
  const [overview, setOverview] = useState(null);
  const [insights, setInsights] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [chartsData, setChartsData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');

  // Modal and Drawer state
  const [activeEvidence, setActiveEvidence] = useState(null);
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(false);
  const [isAskOpen, setIsAskOpen] = useState(false);

  // Load demo dataset automatically on mount or trigger
  const handleExploreDemo = async () => {
    setIsLoading(true);
    setLoadingStep('Ingesting PRISM demo dataset...');

    try {
      setLoadingStep('Profiling business columns & missingness...');
      const res = await fetch('/api/demo');
      const data = await res.json();

      if (data.status === 'success') {
        setLoadingStep('Calculating period-over-period trends...');
        await fetchSessionData();
        setActiveTab('overview');
      }
    } catch (e) {
      console.error("Failed to load demo:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSessionData = async () => {
    try {
      const [ovRes, insRes, recRes, chRes] = await Promise.all([
        fetch('/api/overview'),
        fetch('/api/insights'),
        fetch('/api/recommendations'),
        fetch('/api/charts')
      ]);

      if (ovRes.ok) setOverview(await ovRes.json());
      if (insRes.ok) setInsights(await insRes.json());
      if (recRes.ok) setRecommendations(await recRes.json());
      if (chRes.ok) setChartsData(await chRes.json());
    } catch (e) {
      console.error("Failed fetching session data:", e);
    }
  };

  // Custom File Upload Handler
  const handleFileUpload = async (file) => {
    setIsLoading(true);
    setLoadingStep(`Uploading ${file.name}...`);

    try {
      const formData = new FormData();
      formData.append('file', file);

      setLoadingStep('Analyzing schema & dataset quality...');
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        setLoadingStep('Building grounded evidence trails...');
        await fetchSessionData();
        setActiveTab('overview');
      } else {
        alert("Could not process uploaded file. Please check format.");
      }
    } catch (e) {
      alert("Error uploading file: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEvidence = async (insightId) => {
    try {
      const res = await fetch(`/api/evidence/${insightId}`);
      if (res.ok) {
        const ev = await res.json();
        setActiveEvidence(ev);
        setIsEvidenceOpen(true);
      }
    } catch (e) {
      console.error("Error loading evidence:", e);
    }
  };

  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 selection:bg-cyan-500 selection:text-black flex flex-col">
      
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onExploreDemo={handleExploreDemo}
        datasetName={overview?.dataset_name}
        isAskOpen={isAskOpen}
        setIsAskOpen={setIsAskOpen}
      />

      {/* Main Page View Router */}
      <main className="flex-1">
        {activeTab === 'landing' && (
          <LandingPage
            onAnalyzeClick={() => setActiveTab('upload')}
            onExploreDemo={handleExploreDemo}
          />
        )}

        {activeTab === 'upload' && (
          <DataUpload
            onFileUpload={handleFileUpload}
            onExploreDemo={handleExploreDemo}
            isLoading={isLoading}
            loadingStep={loadingStep}
          />
        )}

        {activeTab === 'overview' && (
          <DataOverview
            overview={overview}
            onProceedToInsights={() => setActiveTab('insights')}
          />
        )}

        {activeTab === 'insights' && (
          <InsightsDashboard
            insights={insights}
            chartsData={chartsData}
            onOpenEvidence={handleOpenEvidence}
            onViewRecommendation={() => setActiveTab('decisions')}
          />
        )}

        {activeTab === 'decisions' && (
          <DecisionCenter
            recommendations={recommendations}
            onOpenEvidence={handleOpenEvidence}
          />
        )}
      </main>

      {/* Evidence Trail Deep-Dive Modal */}
      {isEvidenceOpen && (
        <EvidenceModal
          evidence={activeEvidence}
          onClose={() => setIsEvidenceOpen(false)}
          onGoToAction={() => {
            setIsEvidenceOpen(false);
            setActiveTab('decisions');
          }}
        />
      )}

      {/* Ask PRISM Slide-over AI Assistant */}
      <AskPrism
        isOpen={isAskOpen}
        onClose={() => setIsAskOpen(false)}
        onOpenEvidence={(id) => {
          setIsAskOpen(false);
          handleOpenEvidence(id);
        }}
      />

    </div>
  );
}
