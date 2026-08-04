"use client";
import React from "react";

export function JarvisReportPDF({ data, reportHtml }: { data: any, reportHtml?: string }) {
  if (!data) return null;

  return (
    <div id="jarvis-pdf-report" className="hidden print:block absolute inset-0 bg-white text-black p-12 z-[9999]">
      {/* CSS specific to printing */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #jarvis-pdf-report, #jarvis-pdf-report * { visibility: visible; }
          #jarvis-pdf-report { position: absolute; left: 0; top: 0; width: 100%; height: auto; }
          @page { size: A4; margin: 20mm; }
          .page-break { page-break-before: always; }
        }
      `}</style>

      {/* Cover Page */}
      <div className="h-[250mm] flex flex-col items-center justify-center text-center">
        <h1 className="text-5xl font-black text-[#0B6E62] mb-6">J.A.R.V.I.S.</h1>
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Executive Business Report</h2>
        <p className="text-xl text-gray-500 mb-12">Forecastify Intelligence</p>
        <div className="w-24 h-1 bg-[#0B6E62] mb-12" />
        <p className="text-lg font-medium">Generated: {new Date().toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })} at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
      </div>

      <div className="page-break" />

      {reportHtml ? (
        <div 
          className="mb-12 prose prose max-w-none prose-h2:text-2xl prose-h2:font-bold prose-h2:text-[#0B5A50] prose-h2:border-b-2 prose-h2:border-[#CFE3DF] prose-h2:pb-2 prose-h2:mb-6"
          dangerouslySetInnerHTML={{ __html: reportHtml }} 
        />
      ) : (
        <>
          {/* Overview & Summaries */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-[#0B5A50] border-b-2 border-[#CFE3DF] pb-2 mb-6">Store Overview</h2>
            <div className="grid grid-cols-2 gap-8">
              <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
                <h3 className="font-bold text-gray-700 mb-2">Sales Summary</h3>
                <p className="text-3xl font-black text-green-600">₹{data.salesSummary?.toLocaleString() || "5,200"}</p>
                <p className="text-sm text-gray-500 mt-2">+12% from last week</p>
              </div>
              <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
                <h3 className="font-bold text-gray-700 mb-2">Stock Health</h3>
                <p className="text-3xl font-black text-[#0B6E62]">92%</p>
                <p className="text-sm text-gray-500 mt-2">Optimal range</p>
              </div>
            </div>
          </div>

          {/* Low Stock & Expiry */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-[#0B5A50] border-b-2 border-[#CFE3DF] pb-2 mb-6">Risk Alerts</h2>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-3 border-b border-gray-200 font-bold">Product</th>
                  <th className="p-3 border-b border-gray-200 font-bold">Risk Type</th>
                  <th className="p-3 border-b border-gray-200 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-3 border-b border-gray-100">Amul Taaza Milk</td>
                  <td className="p-3 border-b border-gray-100 text-red-600 font-medium">Low Stock</td>
                  <td className="p-3 border-b border-gray-100">2 units remaining</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-100">Aashirvaad Atta</td>
                  <td className="p-3 border-b border-gray-100 text-orange-600 font-medium">Expiry Risk</td>
                  <td className="p-3 border-b border-gray-100">Expires in 5 days</td>
                </tr>
                <tr>
                  <td className="p-3 border-b border-gray-100">Parle-G</td>
                  <td className="p-3 border-b border-gray-100 text-[#0B6E62] font-medium">Overstock</td>
                  <td className="p-3 border-b border-gray-100">150 units blocking cash</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="page-break" />

          {/* Forecast & Weather Impact */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-[#0B5A50] border-b-2 border-[#CFE3DF] pb-2 mb-6">AI Demand Forecast & Impact</h2>
            <div className="p-6 bg-[#EEF4F2] text-[#123B33] rounded-xl mb-6">
              <h3 className="font-bold mb-2 text-[#0B5A50]">Weather Notice: Heavy Rain Expected</h3>
              <p>Tomorrow's forecast predicts heavy rain. Expect a 15% increase in demand for packaged snacks and instant noodles, and a 10% drop in cold beverages.</p>
            </div>
            <div className="p-6 bg-purple-50 text-purple-900 rounded-xl">
              <h3 className="font-bold mb-2 text-purple-800">Festival Impact: Diwali (2 days away)</h3>
              <p>Historical data indicates a 40% surge in sweets and gifting items. Ensure inventory for dry fruits and chocolates is stocked by tomorrow afternoon.</p>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-[#0B5A50] border-b-2 border-[#CFE3DF] pb-2 mb-6">Jarvis Executive Summary</h2>
            <div className="p-8 bg-gray-50 border border-gray-200 rounded-2xl italic text-gray-700 leading-relaxed text-lg">
              "Your business is performing well this week with sales up by 12%, driven mainly by biscuit and snack demand. However, there is a risk regarding milk inventory, which is critically low. With the upcoming festival, there is a major opportunity to capitalize on sweets and gifting items. I highly recommend ordering 20 more milk packets and restocking dry fruits before Friday to maximize profits."
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      <div className="mt-24 text-center text-sm text-gray-400">
        <p>CONFIDENTIAL BUSINESS REPORT - GENERATED BY FORECASTIFY JARVIS</p>
      </div>
    </div>
  );
}
