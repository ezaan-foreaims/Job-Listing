// src/App.jsx
import React, { useEffect, useState } from "react";
import styled, { ThemeProvider } from "styled-components";
import { useDispatch, useSelector } from "react-redux";
import { 
  fetchJobsThunk, 
  createJobThunk, 
  updateJobThunk, 
  deleteJobThunk, 
  setEditingJob, 
  setDeletingJob, 
  setFilters 
} from "./api/slice/jobsSlice";
import AddEditJob from "./Components/AddEditJob";
import FilterSortJob from "./Components/FilterSortJob";
import { theme } from "./theme";

// --- Styled Components ---
const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 16px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
`;

const Header = styled.h1`
  text-align: center;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 36px;
  margin-bottom: 24px;
`;

const AddButton = styled.button`
  background: ${({ theme }) => theme.colors.success};
  color: white;
  padding: 14px 28px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  cursor: pointer;
  margin-bottom: 20px;
  box-shadow: 0 6px 16px rgba(0,0,0,0.12);
  transition: all 0.3s;

  &:hover {
    opacity: 0.95;
    transform: translateY(-2px);
  }
`;

const JobGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
`;

const JobCard = styled.div`
  background: #fff;
  border-radius: 14px;
  padding: 22px;
  box-shadow: 0 12px 24px rgba(0,0,0,0.08);
  transition: transform 0.3s, box-shadow 0.3s;

  &:hover {
    transform: translateY(-6px);
    box-shadow: 0 18px 36px rgba(0,0,0,0.15);
  }
`;

const JobTitle = styled.h3`
  font-size: 22px;
  margin-bottom: 6px;
  color: ${({ theme }) => theme.colors.primary};
`;

const JobCompany = styled.p`
  font-size: 16px;
  color: #555;
  margin-bottom: 4px;
`;

const JobLocation = styled.p`
  font-size: 14px;
  color: #888;
`;

const CardButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
`;

const EditButton = styled.button`
  flex: 1;
  background: #3498db;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 10px 0;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #2980b9;
    transform: translateY(-2px);
  }
`;

const DeleteButton = styled.button`
  flex: 1;
  background: ${({ theme }) => theme.colors.danger};
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 10px 0;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #c0392b;
    transform: translateY(-2px);
  }
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
`;

const Modal = styled.div`
  background: #fff;
  padding: 40px 36px;
  border-radius: 16px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 20px 50px rgba(0,0,0,0.25);
  text-align: center;
  animation: slideDown 0.25s ease-out forwards;

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-40px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const Title = styled.h2`
  margin-bottom: 20px;
  color: ${({ theme }) => theme.colors.danger || "#e74c3c"};
  font-size: 26px;
  font-weight: 600;
`;

const Text = styled.p`
  margin-bottom: 36px;
  font-size: 16px;
  color: #555;
  line-height: 1.5;
`;

const ModalButtonGroup = styled.div`
  display: flex;
  justify-content: center;
  gap: 16px;
`;

const CancelButton = styled.button`
  padding: 14px 28px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  color: #fff;
  background: #7f8c8d;
  transition: all 0.3s;

  &:hover {
    background: #636e72;
    transform: translateY(-2px);
  }
`;

// Success Modal Styles
const SuccessTitle = styled.h2`
  margin-bottom: 20px;
  color: #27ae60;
  font-size: 24px;
  font-weight: bold;
`;

const SuccessText = styled.p`
  font-size: 16px;
  color: #2c3e50;
  margin-bottom: 24px;
`;

const OkButton = styled.button`
  padding: 12px 24px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  color: #fff;
  background: #27ae60;
  transition: all 0.3s;

  &:hover {
    background: #219150;
    transform: translateY(-2px);
  }
`;

// --- App Component ---
function App() {
  const dispatch = useDispatch();
  const { jobs, loading, editingJob, deletingJob, filters } = useSelector(state => state.jobs);

  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    dispatch(fetchJobsThunk(filters));
  }, [dispatch, filters]);

  const handleSave = async (job) => {
    if (editingJob?.id) {
      await dispatch(updateJobThunk({ id: editingJob.id, job }));
      setSuccessMessage("✅ Job updated successfully!");
    } else {
      await dispatch(createJobThunk(job));
      setSuccessMessage("✅ Job created successfully!");
    }
    dispatch(setEditingJob(null)); 
  };

  const handleDelete = async () => {
    if (!deletingJob) return;
    await dispatch(deleteJobThunk(deletingJob.id));
    dispatch(setDeletingJob(null));
    setSuccessMessage("🗑️ Job deleted successfully!");
  };

  return (
    <ThemeProvider theme={theme}>
      <Container>
        <Header>📋 Job Listings</Header>
        <AddButton onClick={() => dispatch(setEditingJob({}))}>➕ Add Job</AddButton>
        <FilterSortJob onFilter={(f) => dispatch(setFilters(f))} />

        {loading ? (
          <p>Loading...</p>
        ) : (
          <JobGrid>
            {jobs.map((job) => (
              <JobCard key={job.id}>
                <JobTitle>{job.title}</JobTitle>
                <JobCompany>{job.company}</JobCompany>
                <JobLocation>{job.location}</JobLocation>
                <CardButtonGroup>
                  <EditButton onClick={() => dispatch(setEditingJob(job))}>Edit</EditButton>
                  <DeleteButton onClick={() => dispatch(setDeletingJob(job))}>Delete</DeleteButton>
                </CardButtonGroup>
              </JobCard>
            ))}
          </JobGrid>
        )}

        {/* Add/Edit Modal */}
        {editingJob && (
          <AddEditJob
            initialData={editingJob?.id ? editingJob : null}
            onSave={handleSave}
            onClose={() => dispatch(setEditingJob(null))}
          />
        )}

        {/* Delete Confirmation Modal */}
        {deletingJob && (
          <Overlay>
            <Modal>
              <Title>Delete Job?</Title>
              <Text>
                Are you sure you want to delete <strong>{deletingJob.title}</strong>
                {deletingJob.company ? ` at ${deletingJob.company}` : ""}?
              </Text>
              <ModalButtonGroup>
                <CancelButton onClick={() => dispatch(setDeletingJob(null))}>Cancel</CancelButton>
                <DeleteButton onClick={handleDelete}>Delete</DeleteButton>
              </ModalButtonGroup>
            </Modal>
          </Overlay>
        )}

        {/* Success Modal */}
        {successMessage && (
          <Overlay>
            <Modal>
              <SuccessTitle>🎉 Success</SuccessTitle>
              <SuccessText>{successMessage}</SuccessText>
              <OkButton onClick={() => setSuccessMessage(null)}>OK</OkButton>
            </Modal>
          </Overlay>
        )}
      </Container>
    </ThemeProvider>
  );
}

export default App;
