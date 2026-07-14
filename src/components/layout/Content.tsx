import React from 'react';

interface ContentProps {
  service: 'ocr' | 'liveness' | 'compare-faces';
}

const Content: React.FC<ContentProps> = ({ service }) => {
  const renderServiceContent = () => {
    switch (service) {
      case 'ocr':
        return (
          <div className="service-content ocr-content">
            <h2>Document OCR Verification</h2>
            <p>Upload a document image for verification and text extraction.</p>
            <div className="upload-area">
              <p>Drag & drop or click to upload document</p>
              <input type="file" accept="image/*" />
            </div>
            <button className="primary-button">Start OCR Verification</button>
          </div>
        );
      
      case 'liveness':
        return (
          <div className="service-content liveness-content">
            <h2>Liveness Check</h2>
            <p>Verify that you're a real person, not a photo or video.</p>
            <div className="camera-area">
              <div className="camera-placeholder">
                Camera feed will appear here
              </div>
            </div>
            <button className="primary-button">Start Liveness Check</button>
          </div>
        );
      
      case 'compare-faces':
        return (
          <div className="service-content face-comparison-content">
            <h2>Face Comparison</h2>
            <p>Compare two faces to verify identity match.</p>
            <div className="comparison-area">
              <div className="image-upload reference-image">
                <p>Reference Image</p>
                <input type="file" accept="image/*" />
              </div>
              <div className="vs-separator">VS</div>
              <div className="image-upload comparison-image">
                <p>Comparison Image</p>
                <input type="file" accept="image/*" />
              </div>
            </div>
            <button className="primary-button">Compare Faces</button>
          </div>
        );
      
      default:
        return (
          <div className="service-content default-content">
            <h2>Select a Service</h2>
            <p>Please specify a verification service in the URL.</p>
            <div className="service-options">
              <div className="service-option">
                <h3>OCR</h3>
                <p>Document text extraction and verification</p>
                <code>?service=ocr&amp;tenant=your_tenant</code>
              </div>
              <div className="service-option">
                <h3>Liveness</h3>
                <p>Real-time face detection</p>
                <code>?service=liveness&amp;tenant=your_tenant</code>
              </div>
              <div className="service-option">
                <h3>Face Comparison</h3>
                <p>Match faces between images</p>
                <code>?service=compare-faces&amp;tenant=your_tenant</code>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <main className="content">
      {renderServiceContent()}
    </main>
  );
};

export default Content;