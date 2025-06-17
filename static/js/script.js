document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.querySelector('.search-input');
    const totalStudentsSpan = document.getElementById('total-students-count');
    const studentCardsContainer = document.getElementById("students"); // Main container for student cards and separators

    let allStudentsData = [];

    async function loadStudents() {
        if (!studentCardsContainer) {
            console.error("Students container not found in the DOM.");
            if (totalStudentsSpan) totalStudentsSpan.textContent = 'Error';
            return;
        }
        try {
            const response = await fetch('data.json'); // Assuming data.json is in the same directory or accessible via this path
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allStudentsData = await response.json();
            if (totalStudentsSpan) {
                totalStudentsSpan.textContent = allStudentsData.length;
            }
            renderStudents(allStudentsData);
        } catch (error) {
            console.error("Could not load student data:", error);
            studentCardsContainer.innerHTML = '<p class="text-danger text-center">Error loading student data. Please check console.</p>';
            if (totalStudentsSpan) {
                totalStudentsSpan.textContent = 'Error';
            }
        }
    }

    function renderStudents(studentsToRender) {
        if (!studentCardsContainer) {
            console.error("#students container not found. Cannot render students.");
            return;
        }
        studentCardsContainer.innerHTML = ''; // Clear existing content

        if (studentsToRender.length === 0) {
            studentCardsContainer.innerHTML = '<p class="text-center ubuntu-light">No students found.</p>';
            return;
        }

        // Sort students by arrivalDate first to ensure months are in chronological order
        const sortedStudents = [...studentsToRender].sort((a, b) => {
            const dateA = new Date(a.arrivalDate);
            const dateB = new Date(b.arrivalDate);
            if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0; // Handle invalid dates gracefully
            return dateA - dateB;
        });


        const groupedStudents = sortedStudents.reduce((acc, student) => {
            try {
                const date = new Date(student.arrivalDate);
                if (isNaN(date.getTime())) { // Check for invalid date
                    console.warn("Invalid arrivalDate for student:", student.name, student.arrivalDate, "- skipping this student for grouping.");
                    return acc; // Skip student with invalid date
                }
                const yearName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
                
                // first uppercase
                const monthYear = yearName.charAt(0).toUpperCase() + yearName.slice(1);

                if (!acc[monthYear]) {
                    acc[monthYear] = [];
                }
                acc[monthYear].push(student);
            } catch (e) {
                console.error("Error processing date for student:", student, e);
            }
            return acc;
        }, {});
        
        // Get month keys and sort them based on the first student's arrivalDate in each group
        const monthOrder = Object.keys(groupedStudents).sort((a,b) => {
            const dateA = new Date(groupedStudents[a][0].arrivalDate);
            const dateB = new Date(groupedStudents[b][0].arrivalDate);
            if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
            return dateA - dateB;
        });

        monthOrder.reverse()

        monthOrder.forEach(monthYear => {
            // 1. Create and append the month separator structure
            const monthSeparatorWrapper = document.createElement('div');
            monthSeparatorWrapper.classList.add('d-flex');
            
            const separatorDiv = document.createElement('div');
            separatorDiv.className = 'separator';
            separatorDiv.innerHTML = `
                <p>${monthYear}</p>
                <div class="line"></div>
            `;
            monthSeparatorWrapper.appendChild(separatorDiv);
            studentCardsContainer.appendChild(monthSeparatorWrapper);

            // 2. Create a card-wrapper for the current month's students
            const monthCardWrapper = document.createElement('div');
            monthCardWrapper.className = 'card-wrapper';

            groupedStudents[monthYear].forEach(student => {
                const cardDiv = document.createElement('div');
                cardDiv.className = 'card';
                // Add data attributes for filtering
                cardDiv.dataset.name = (student.name || '').toLowerCase();
                cardDiv.dataset.school = (student.school || '').toLowerCase();
                cardDiv.dataset.bio = (student.bio || '').toLowerCase();
                cardDiv.dataset.job = (student.job || 'student').toLowerCase(); // Default to 'student' if job is not present

                cardDiv.innerHTML = `
                    <div class="content">
                        <div class="description">
                            <div class="profile">
                                <img src="${student.profileImg}" alt="Profile Picture ${student.name || ''}" class="profile-img">
                            </div>
                            <div class="details">
                                <div class="job">
                                    <p class="ubuntu-light">${(student.job || 'STUDENT').toUpperCase()}</p>
                                </div>
                                <div class="name">
                                    <p>${student.name || 'N/A'}</p>
                                </div>
                                <div class="school">
                                    <p>${student.school || 'N/A'}</p>
                                </div>
                                <div class="bio">
                                    <p>${student.bio || 'No bio available.'}</p>
                                </div>
                            </div>
                        </div>
                        <div class="actions">
                            <div class="call-to-action">
                                <a href="${student.githubLink || '#'}" target="_blank" rel="noopener noreferrer" aria-label="${student.name || 'Student'}'s GitHub profile">
                                    <i class="bi bi-github"></i>
                                </a>
                            </div>
                            <div class="call-to-action">
                                <a href="${student.cv || '#'}" target="_blank" rel="noopener noreferrer" aria-label="${student.name || 'Student'}'s portfoglio">
                                    <i class="bi bi-file-earmark-person"></i>
                                </a>
                            </div>
                        </div>
                    </div>
                `;
                monthCardWrapper.appendChild(cardDiv);
            });
            studentCardsContainer.appendChild(monthCardWrapper);
        });
    }

    function filterStudents() {
        if (!searchInput || !studentCardsContainer) return;
        const searchTerm = searchInput.value.toLowerCase().trim();

        let anyCardVisibleGlobal = false;
        const noResultsMessageId = 'no-filter-results-message';
        let noResultsMessageEl = studentCardsContainer.querySelector(`#${noResultsMessageId}`);

        // Remove existing "no results" message before re-filtering
        if (noResultsMessageEl) {
            noResultsMessageEl.remove();
            noResultsMessageEl = null; // Reset
        }
        
        const monthCardWrappers = studentCardsContainer.querySelectorAll('.card-wrapper');

        monthCardWrappers.forEach(monthCw => {
            const cardsInThisMonthWrapper = monthCw.querySelectorAll('.card');
            let monthHasVisibleCards = false;

            cardsInThisMonthWrapper.forEach(card => {
                const name = card.dataset.name || '';
                const bio = card.dataset.bio || '';
                const job = card.dataset.job || '';
                const isVisible = name.includes(searchTerm) || bio.includes(searchTerm) || job.includes(searchTerm);
                
                card.style.display = isVisible ? '' : 'none';
                if (isVisible) {
                    monthHasVisibleCards = true;
                    anyCardVisibleGlobal = true;
                }
            });

            monthCw.style.display = monthHasVisibleCards ? '' : 'none';

            const separatorWrapper = monthCw.previousElementSibling;
            if (separatorWrapper && separatorWrapper.classList.contains('d-flex') && separatorWrapper.querySelector('.separator')) {
                separatorWrapper.style.display = monthHasVisibleCards ? '' : 'none';
            }
        });

        // If no cards are visible anywhere after filtering and search term is not empty
        if (!anyCardVisibleGlobal && searchTerm !== '') {
            if (!noResultsMessageEl) { // Check again, just in case
                const p = document.createElement('p');
                p.id = noResultsMessageId;
                p.className = 'text-center ubuntu-light';
                p.textContent = 'No students found matching your search.';
                studentCardsContainer.appendChild(p); // Append to the main container
            }
        }
    }

    if (searchInput) {
        searchInput.addEventListener('input', filterStudents);
    }

    loadStudents();
});