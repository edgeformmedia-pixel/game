/**
 * FIFA MANAGER - Central Hub JavaScript
 * Populates the Career Mode hub with calendar, news, transfers, and tables
 */

(function(window) {
    'use strict';

    /**
     * Update Career Hub (Central Tab)
     */
    window.updateCareerHub = function() {
        if (!window.gameState || !window.gameState.selectedTeam) return;
        
        renderAdvanceCalendar();
        renderNewsHighlight();
        renderTransferNetwork();
        renderNewsFeed();
        renderTablePreview();
    };

    /**
     * Render Advance Calendar (5-day week view)
     */
    function renderAdvanceCalendar() {
        const calendarEl = document.getElementById('calendarWeek');
        const dateEl = document.getElementById('advanceDate');
        
        if (!calendarEl || !window.gameState.currentDate) return;

        const currentDate = new Date(window.gameState.currentDate);
        
        // Update date display
        if (dateEl) {
            const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
                               'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
            dateEl.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        }

        // Generate 5-day view (today + 4 days ahead)
        const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        let html = '';

        for (let i = 0; i < 5; i++) {
            const date = new Date(currentDate);
            date.setDate(date.getDate() + i);
            
            const dayName = dayNames[date.getDay()];
            const dayNum = date.getDate();
            const isToday = i === 0;
            
            // Check if there's a match on this day
            const hasMatch = window.gameState.fixtures && window.gameState.fixtures.some(fixture => {
                if (fixture.played) return false;
                const fixtureDate = new Date(fixture.date);
                return fixtureDate.toDateString() === date.toDateString();
            });
            
            const matchFixture = hasMatch ? window.gameState.fixtures.find(f => {
                const fixtureDate = new Date(f.date);
                return fixtureDate.toDateString() === date.toDateString() && !f.played;
            }) : null;

            const opponent = matchFixture ? 
                (matchFixture.home.team_name === window.gameState.selectedTeam.team_name ? 
                    matchFixture.away : matchFixture.home) : null;
            
            const opponentLogo = opponent?.club_logo_url || '';

            html += `
                <div class="calendar-day ${isToday ? 'active' : ''} ${hasMatch ? 'match-day' : ''}"
                     onclick="advanceToDay(${i})">
                    <div class="day-name">${dayName}</div>
                    <div class="day-number">${dayNum}</div>
                    <div class="day-icon">
                        ${hasMatch && opponentLogo ? 
                            `<img src="${opponentLogo}" alt="Match" onerror="this.style.display='none';">` : 
                            hasMatch ? '⚽' : '📅'}
                    </div>
                    ${hasMatch ? '<div class="match-indicator"></div>' : ''}
                </div>
            `;
        }

        calendarEl.innerHTML = html;
    }

    /**
     * Advance to specific day
     */
    window.advanceToDay = function(daysAhead) {
        if (!window.gameState.currentDate) return;
        
        // Advance date
        for (let i = 0; i < daysAhead; i++) {
            window.gameState.currentDate.setDate(window.gameState.currentDate.getDate() + 1);
            
            // Check if there's a match today
            const today = new Date(window.gameState.currentDate);
            const todayMatch = window.gameState.fixtures.find(f => {
                const fixtureDate = new Date(f.date);
                return fixtureDate.toDateString() === today.toDateString() && !f.played;
            });
            
            if (todayMatch) {
                window.gameState.nextMatch = todayMatch;
                // Could auto-simulate here or prompt user
                if (typeof window.simulateMatch === 'function') {
                    window.simulateMatch();
                }
                break;
            }
        }
        
        // Update UI
        if (typeof window.updateHeader === 'function') {
            window.updateHeader();
        }
        window.updateCareerHub();
    };

    /**
     * Render News Highlight (top story with rotation)
     */
    function renderNewsHighlight() {
        const headlineEl = document.getElementById('highlightHeadline');
        const dateEl = document.getElementById('highlightDate');
        const imageEl = document.getElementById('highlightImage');
        const paginationEl = document.getElementById('newsPagination');
        
        if (!headlineEl) return;

        // Generate multiple news stories
        const allStories = generateAllTopStories();
        
        // Store in window for pagination
        window.newsStories = allStories;
        window.currentNewsIndex = window.currentNewsIndex || 0;
        
        // Get current story
        const currentStory = allStories[window.currentNewsIndex];
        
        if (currentStory) {
            // Update headline
            headlineEl.textContent = currentStory.headline;
            
            // Update date
            if (dateEl && window.gameState.currentDate) {
                const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                dateEl.textContent = window.gameState.currentDate.toLocaleDateString('en-US', options);
            }
            
            // Update image based on story type
            if (imageEl) {
                if (currentStory.type === 'match') {
                    imageEl.innerHTML = '<div style="font-size:3rem;color:rgba(255,255,255,0.3);">⚽</div>';
                } else if (currentStory.type === 'transfer') {
                    imageEl.innerHTML = '<div style="font-size:3rem;color:rgba(255,255,255,0.3);">📝</div>';
                } else if (currentStory.type === 'table') {
                    imageEl.innerHTML = '<div style="font-size:3rem;color:rgba(255,255,255,0.3);">📊</div>';
                } else {
                    imageEl.innerHTML = '<div style="font-size:3rem;color:rgba(255,255,255,0.3);">📰</div>';
                }
            }
            
            // Update pagination dots
            if (paginationEl && allStories.length > 1) {
                let dotsHtml = '';
                allStories.forEach((_, index) => {
                    const activeClass = index === window.currentNewsIndex ? 'active' : '';
                    dotsHtml += `<div class="news-dot ${activeClass}" onclick="changeNewsStory(${index})"></div>`;
                });
                paginationEl.innerHTML = dotsHtml;
                paginationEl.style.display = 'flex';
            } else if (paginationEl) {
                paginationEl.style.display = 'none';
            }
        }
        
        // Auto-rotate every 8 seconds
        if (window.newsRotateTimer) {
            clearInterval(window.newsRotateTimer);
        }
        
        window.newsRotateTimer = setInterval(() => {
            if (window.newsStories && window.newsStories.length > 1) {
                window.currentNewsIndex = (window.currentNewsIndex + 1) % window.newsStories.length;
                renderNewsHighlight();
            }
        }, 8000);
    }
    
    /**
     * Change news story manually
     */
    window.changeNewsStory = function(index) {
        if (window.newsStories && index >= 0 && index < window.newsStories.length) {
            window.currentNewsIndex = index;
            renderNewsHighlight();
        }
    };
    
    /**
     * Generate all top stories for rotation
     */
    function generateAllTopStories() {
        const stories = [];
        
        // 1. YOUR TEAM'S LAST MATCH
        if (window.gameState.fixtures) {
            const yourMatches = window.gameState.fixtures.filter(f => 
                f.played && 
                (f.home.team_name === window.gameState.selectedTeam.team_name || 
                 f.away.team_name === window.gameState.selectedTeam.team_name)
            );
            
            const lastMatch = yourMatches.slice(-1)[0];
            if (lastMatch && lastMatch.result) {
                const isHome = lastMatch.home.team_name === window.gameState.selectedTeam.team_name;
                const yourScore = isHome ? lastMatch.result.homeScore : lastMatch.result.awayScore;
                const oppScore = isHome ? lastMatch.result.awayScore : lastMatch.result.homeScore;
                const opponent = isHome ? lastMatch.away.team_name : lastMatch.home.team_name;
                
                if (yourScore > oppScore) {
                    const margin = yourScore - oppScore;
                    if (margin >= 3) {
                        stories.push({
                            headline: `${window.gameState.selectedTeam.team_name.toUpperCase()} DOMINATE IN ${yourScore}-${oppScore} THRASHING OF ${opponent.toUpperCase()}`,
                            type: 'match'
                        });
                    } else {
                        stories.push({
                            headline: `${window.gameState.selectedTeam.team_name.toUpperCase()} SECURE ${yourScore}-${oppScore} VICTORY OVER ${opponent.toUpperCase()}`,
                            type: 'match'
                        });
                    }
                } else if (yourScore < oppScore) {
                    const margin = oppScore - yourScore;
                    if (margin >= 3) {
                        stories.push({
                            headline: `CRUSHING ${yourScore}-${oppScore} DEFEAT TO ${opponent.toUpperCase()} LEAVES FANS STUNNED`,
                            type: 'match'
                        });
                    } else {
                        stories.push({
                            headline: `${opponent.toUpperCase()} EDGE PAST ${window.gameState.selectedTeam.team_name.toUpperCase()} ${oppScore}-${yourScore}`,
                            type: 'match'
                        });
                    }
                } else {
                    if (yourScore === 0) {
                        stories.push({
                            headline: `GOALLESS STALEMATE AS ${window.gameState.selectedTeam.team_name.toUpperCase()} HELD BY ${opponent.toUpperCase()}`,
                            type: 'match'
                        });
                    } else {
                        stories.push({
                            headline: `${window.gameState.selectedTeam.team_name.toUpperCase()} EARN HARD-FOUGHT ${yourScore}-${yourScore} DRAW WITH ${opponent.toUpperCase()}`,
                            type: 'match'
                        });
                    }
                }
            }
        }
        
        // 2. OTHER INTERESTING LEAGUE RESULTS (up to 3)
        if (window.gameState.fixtures) {
            const otherMatches = window.gameState.fixtures.filter(f => 
                f.played && 
                f.home.team_name !== window.gameState.selectedTeam.team_name && 
                f.away.team_name !== window.gameState.selectedTeam.team_name &&
                f.home.league_name === window.gameState.selectedTeam.league_name
            ).slice(-10); // Last 10 other matches
            
            const interestingResults = [];
            
            otherMatches.forEach(match => {
                if (!match.result) return;
                
                const totalGoals = match.result.homeScore + match.result.awayScore;
                const margin = Math.abs(match.result.homeScore - match.result.awayScore);
                
                // High-scoring game
                if (totalGoals >= 6) {
                    interestingResults.push({
                        headline: `${totalGoals} GOAL THRILLER AS ${match.home.team_name.toUpperCase()} AND ${match.away.team_name.toUpperCase()} SHARE SPOILS`,
                        type: 'match',
                        priority: 2
                    });
                }
                
                // Big win
                if (margin >= 4) {
                    const winner = match.result.homeScore > match.result.awayScore ? match.home : match.away;
                    const loser = match.result.homeScore > match.result.awayScore ? match.away : match.home;
                    interestingResults.push({
                        headline: `${winner.team_name.toUpperCase()} DEMOLISH ${loser.team_name.toUpperCase()} ${Math.max(match.result.homeScore, match.result.awayScore)}-${Math.min(match.result.homeScore, match.result.awayScore)}`,
                        type: 'match',
                        priority: 1
                    });
                }
                
                // Close game with goals
                if (totalGoals >= 4 && margin <= 1) {
                    interestingResults.push({
                        headline: `${match.home.team_name.toUpperCase()} AND ${match.away.team_name.toUpperCase()} PLAY OUT ${match.result.homeScore}-${match.result.awayScore} EPIC`,
                        type: 'match',
                        priority: 3
                    });
                }
            });
            
            // Add top 3 interesting results
            interestingResults
                .sort((a, b) => a.priority - b.priority)
                .slice(0, 3)
                .forEach(result => stories.push(result));
        }
        
        // 3. UPCOMING FIXTURE PREVIEW
        if (window.gameState.nextMatch) {
            const opponent = window.gameState.nextMatch.home.team_name === window.gameState.selectedTeam.team_name 
                ? window.gameState.nextMatch.away 
                : window.gameState.nextMatch.home;
            
            const daysUntil = Math.ceil((window.gameState.nextMatch.date - window.gameState.currentDate) / (1000 * 60 * 60 * 24));
            
            if (daysUntil <= 2) {
                stories.push({
                    headline: `${window.gameState.selectedTeam.team_name.toUpperCase()} PREPARE FOR CRUCIAL CLASH WITH ${opponent.team_name.toUpperCase()}`,
                    type: 'preview'
                });
            }
        }
        
        // 4. LEAGUE STANDING NEWS
        const standings = generateLeagueStandings();
        if (standings.length > 0) {
            const userPosition = standings.findIndex(t => t.team_name === window.gameState.selectedTeam.team_name) + 1;
            const leader = standings[0];
            
            if (userPosition === 1) {
                stories.push({
                    headline: `${window.gameState.selectedTeam.team_name.toUpperCase()} MAINTAIN TOP SPOT IN ${window.gameState.selectedTeam.league_name.toUpperCase()}`,
                    type: 'table'
                });
            } else if (userPosition <= 3) {
                stories.push({
                    headline: `${window.gameState.selectedTeam.team_name.toUpperCase()} CHASE LEADERS ${leader.team_name.toUpperCase()} IN TIGHT TITLE RACE`,
                    type: 'table'
                });
            }
        }
        
        // 5. GENERIC FALLBACK if no stories
        if (stories.length === 0) {
            stories.push({
                headline: `${window.gameState.selectedTeam.team_name.toUpperCase()} SQUAD TRAINING HARD AHEAD OF NEXT FIXTURE`,
                type: 'general'
            });
        }
        
        // Limit to 6 stories max for rotation
        return stories.slice(0, 6);
    }

    /**
     * Generate top news story from league activity
     */
    function generateTopNews() {
        const stories = [];
        
        // 1. YOUR TEAM'S LAST MATCH
        if (window.gameState.fixtures) {
            const yourMatches = window.gameState.fixtures.filter(f => 
                f.played && 
                (f.home.team_name === window.gameState.selectedTeam.team_name || 
                 f.away.team_name === window.gameState.selectedTeam.team_name)
            );
            
            const lastMatch = yourMatches.slice(-1)[0];
            if (lastMatch && lastMatch.result) {
                const isHome = lastMatch.home.team_name === window.gameState.selectedTeam.team_name;
                const yourScore = isHome ? lastMatch.result.homeScore : lastMatch.result.awayScore;
                const oppScore = isHome ? lastMatch.result.awayScore : lastMatch.result.homeScore;
                const opponent = isHome ? lastMatch.away.team_name : lastMatch.home.team_name;
                
                if (yourScore > oppScore) {
                    const margin = yourScore - oppScore;
                    if (margin >= 3) {
                        stories.push({
                            headline: `${window.gameState.selectedTeam.team_name.toUpperCase()} DOMINATE IN ${yourScore}-${oppScore} THRASHING OF ${opponent.toUpperCase()}`,
                            type: 'match'
                        });
                    } else {
                        stories.push({
                            headline: `${window.gameState.selectedTeam.team_name.toUpperCase()} SECURE ${yourScore}-${oppScore} VICTORY OVER ${opponent.toUpperCase()}`,
                            type: 'match'
                        });
                    }
                } else if (yourScore < oppScore) {
                    const margin = oppScore - yourScore;
                    if (margin >= 3) {
                        stories.push({
                            headline: `CRUSHING ${yourScore}-${oppScore} DEFEAT TO ${opponent.toUpperCase()} LEAVES FANS STUNNED`,
                            type: 'match'
                        });
                    } else {
                        stories.push({
                            headline: `${opponent.toUpperCase()} EDGE PAST ${window.gameState.selectedTeam.team_name.toUpperCase()} ${oppScore}-${yourScore}`,
                            type: 'match'
                        });
                    }
                } else {
                    if (yourScore === 0) {
                        stories.push({
                            headline: `GOALLESS STALEMATE AS ${window.gameState.selectedTeam.team_name.toUpperCase()} HELD BY ${opponent.toUpperCase()}`,
                            type: 'match'
                        });
                    } else {
                        stories.push({
                            headline: `${window.gameState.selectedTeam.team_name.toUpperCase()} EARN HARD-FOUGHT ${yourScore}-${yourScore} DRAW WITH ${opponent.toUpperCase()}`,
                            type: 'match'
                        });
                    }
                }
            }
        }
        
        // 2. OTHER LEAGUE RESULTS
        if (window.gameState.fixtures) {
            const otherMatches = window.gameState.fixtures.filter(f => 
                f.played && 
                f.home.team_name !== window.gameState.selectedTeam.team_name && 
                f.away.team_name !== window.gameState.selectedTeam.team_name &&
                f.home.league_name === window.gameState.selectedTeam.league_name
            );
            
            // Find interesting results (high scores, upsets, etc.)
            otherMatches.forEach(match => {
                if (!match.result) return;
                
                const totalGoals = match.result.homeScore + match.result.awayScore;
                const margin = Math.abs(match.result.homeScore - match.result.awayScore);
                
                // High-scoring game
                if (totalGoals >= 6) {
                    stories.push({
                        headline: `${totalGoals} GOAL THRILLER AS ${match.home.team_name.toUpperCase()} AND ${match.away.team_name.toUpperCase()} SHARE SPOILS`,
                        type: 'match'
                    });
                }
                
                // Big win
                if (margin >= 4) {
                    const winner = match.result.homeScore > match.result.awayScore ? match.home : match.away;
                    const loser = match.result.homeScore > match.result.awayScore ? match.away : match.home;
                    stories.push({
                        headline: `${winner.team_name.toUpperCase()} DEMOLISH ${loser.team_name.toUpperCase()} ${Math.max(match.result.homeScore, match.result.awayScore)}-${Math.min(match.result.homeScore, match.result.awayScore)}`,
                        type: 'match'
                    });
                }
                
                // Close game with goals
                if (totalGoals >= 4 && margin <= 1) {
                    stories.push({
                        headline: `${match.home.team_name.toUpperCase()} AND ${match.away.team_name.toUpperCase()} PLAY OUT ${match.result.homeScore}-${match.result.awayScore} EPIC`,
                        type: 'match'
                    });
                }
            });
        }
        
        // 3. UPCOMING FIXTURE PREVIEW
        if (window.gameState.nextMatch) {
            const opponent = window.gameState.nextMatch.home.team_name === window.gameState.selectedTeam.team_name 
                ? window.gameState.nextMatch.away 
                : window.gameState.nextMatch.home;
            
            const daysUntil = Math.ceil((window.gameState.nextMatch.date - window.gameState.currentDate) / (1000 * 60 * 60 * 24));
            
            if (daysUntil <= 1) {
                stories.push({
                    headline: `${window.gameState.selectedTeam.team_name.toUpperCase()} PREPARE FOR CRUCIAL CLASH WITH ${opponent.team_name.toUpperCase()}`,
                    type: 'preview'
                });
            }
        }
        
        // 4. TRANSFER NEWS (if available)
        if (window.gameState.transferHistory && window.gameState.transferHistory.length > 0) {
            const recentTransfer = window.gameState.transferHistory[window.gameState.transferHistory.length - 1];
            stories.push({
                headline: `${recentTransfer.playerName.toUpperCase()} COMPLETES MOVE FROM ${recentTransfer.from.toUpperCase()} TO ${recentTransfer.to.toUpperCase()}`,
                type: 'transfer'
            });
        }
        
        // 5. LEAGUE STANDING NEWS
        const standings = generateLeagueStandings();
        if (standings.length > 0) {
            const userPosition = standings.findIndex(t => t.team_name === window.gameState.selectedTeam.team_name) + 1;
            const leader = standings[0];
            
            if (userPosition === 1) {
                stories.push({
                    headline: `${window.gameState.selectedTeam.team_name.toUpperCase()} MAINTAIN TOP SPOT IN ${window.gameState.selectedTeam.league_name.toUpperCase()}`,
                    type: 'table'
                });
            } else if (userPosition <= 3) {
                stories.push({
                    headline: `${window.gameState.selectedTeam.team_name.toUpperCase()} CHASE LEADERS ${leader.team_name.toUpperCase()} IN TIGHT TITLE RACE`,
                    type: 'table'
                });
            } else if (userPosition >= standings.length - 3) {
                stories.push({
                    headline: `${window.gameState.selectedTeam.team_name.toUpperCase()} FACE RELEGATION BATTLE AS SEASON INTENSIFIES`,
                    type: 'table'
                });
            }
        }
        
        // 6. GENERIC FALLBACK NEWS
        if (stories.length === 0) {
            const genericNews = [
                `${window.gameState.selectedTeam.team_name.toUpperCase()} SQUAD TRAINING HARD AHEAD OF NEXT FIXTURE`,
                `MANAGER CALLS FOR FOCUS AS ${window.gameState.selectedTeam.team_name.toUpperCase()} ENTER CRUCIAL PERIOD`,
                `${window.gameState.selectedTeam.team_name.toUpperCase()} FANS REMAIN OPTIMISTIC DESPITE CHALLENGES`,
                `SQUAD DEPTH TESTED AS ${window.gameState.selectedTeam.team_name.toUpperCase()} ROTATION CONTINUES`,
                `${window.gameState.selectedTeam.team_name.toUpperCase()} SCOUTING NETWORK IDENTIFIES NEW TARGETS`
            ];
            
            stories.push({
                headline: genericNews[Math.floor(Math.random() * genericNews.length)],
                type: 'general'
            });
        }
        
        // Return random story from available pool
        return stories[Math.floor(Math.random() * Math.min(stories.length, 6))];
    }

    /**
     * Render Transfer Network (recent signings)
     */
    function renderTransferNetwork() {
        const listEl = document.getElementById('transferNetworkList');
        const newCountEl = document.getElementById('newTransfers');
        const updatesCountEl = document.getElementById('updatedTransfers');
        
        if (!listEl) return;

        // Get recent transfers from game state or generate sample
        const recentTransfers = getRecentTransfers();
        
        if (newCountEl) newCountEl.textContent = recentTransfers.length;
        if (updatesCountEl) updatesCountEl.textContent = '0';

        if (recentTransfers.length === 0) {
            listEl.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.3);padding:20px;">No recent transfers</div>';
            return;
        }

        let html = '';
        recentTransfers.slice(0, 2).forEach(transfer => {
            html += `
                <div class="transfer-player-card">
                    <div class="transfer-player-image">
                        ${transfer.playerImage ? 
                            `<img src="${transfer.playerImage}" alt="${transfer.playerName}">` : 
                            '👤'}
                    </div>
                    <div class="transfer-player-info">
                        <div class="transfer-player-name">${transfer.playerName}</div>
                        <div class="transfer-player-position">${transfer.position}</div>
                        <div class="transfer-player-clubs">
                            <div class="transfer-club-badge">
                                ${transfer.fromBadge ? 
                                    `<img src="${transfer.fromBadge}" alt="${transfer.from}">` : 
                                    '⚽'}
                            </div>
                            <div class="transfer-arrow">→</div>
                            <div class="transfer-club-badge">
                                ${transfer.toBadge ? 
                                    `<img src="${transfer.toBadge}" alt="${transfer.to}">` : 
                                    '⚽'}
                            </div>
                        </div>
                    </div>
                    <div class="transfer-player-flags">
                        ${transfer.flag ? 
                            `<div class="transfer-flag"><img src="${transfer.flag}" alt="Country"></div>` : 
                            '<div class="transfer-flag">🏴</div>'}
                    </div>
                </div>
            `;
        });

        listEl.innerHTML = html;
    }

    /**
     * Get recent transfers (sample data for now)
     */
    function getRecentTransfers() {
        // In a real game, this would pull from transfer history
        // For now, generate sample based on league teams
        const transfers = [];
        
        if (window.gameState.allTeams && window.gameState.allPlayers) {
            const leagueTeams = window.gameState.allTeams.filter(t => 
                t.league_name === window.gameState.selectedTeam.league_name
            );
            
            // Get some random players from league teams
            leagueTeams.slice(0, 3).forEach((team, i) => {
                const teamPlayers = window.gameState.allPlayers.filter(p => 
                    p.club?.name === team.team_name
                );
                
                if (teamPlayers.length > 0) {
                    const player = teamPlayers[Math.floor(Math.random() * Math.min(5, teamPlayers.length))];
                    transfers.push({
                        playerName: player.basic_info?.short_name || 'Unknown',
                        position: (player.player_positions || 'MID').split(',')[0],
                        from: team.team_name,
                        to: leagueTeams[(i + 1) % leagueTeams.length].team_name,
                        fromBadge: team.club_logo_url,
                        toBadge: leagueTeams[(i + 1) % leagueTeams.length].club_logo_url,
                        playerImage: null,
                        flag: null
                    });
                }
            });
        }
        
        return transfers;
    }

    /**
     * Render News Feed (recent league stories)
     */
    function renderNewsFeed() {
        const feedEl = document.getElementById('newsFeedList');
        if (!feedEl) return;

        const newsItems = [];
        
        // Get recent league results
        if (window.gameState.fixtures) {
            const recentMatches = window.gameState.fixtures
                .filter(f => f.played && f.result)
                .slice(-10); // Last 10 matches
            
            recentMatches.forEach(match => {
                const homeScore = match.result.homeScore;
                const awayScore = match.result.awayScore;
                const totalGoals = homeScore + awayScore;
                const margin = Math.abs(homeScore - awayScore);
                
                // Big upset or interesting result
                if (margin >= 3) {
                    const winner = homeScore > awayScore ? match.home.team_name : match.away.team_name;
                    const loser = homeScore > awayScore ? match.away.team_name : match.home.team_name;
                    newsItems.push({
                        text: `${winner} Cruise Past ${loser} ${Math.max(homeScore, awayScore)}-${Math.min(homeScore, awayScore)}`,
                        type: 'match'
                    });
                }
                
                // High-scoring thriller
                if (totalGoals >= 5 && margin <= 2) {
                    newsItems.push({
                        text: `${match.home.team_name} and ${match.away.team_name} Share ${totalGoals} Goals in ${homeScore}-${awayScore} Thriller`,
                        type: 'match'
                    });
                }
                
                // Goalless draw
                if (totalGoals === 0) {
                    newsItems.push({
                        text: `${match.home.team_name} Held to Goalless Draw by ${match.away.team_name}`,
                        type: 'match'
                    });
                }
            });
        }
        
        // Add transfer rumors if not enough match news
        if (newsItems.length < 3 && window.gameState.allTeams) {
            const leagueTeams = window.gameState.allTeams.filter(t => 
                t.league_name === window.gameState.selectedTeam.league_name
            );
            
            const randomTeams = leagueTeams.sort(() => Math.random() - 0.5).slice(0, 3);
            
            randomTeams.forEach(team => {
                const rumorTemplates = [
                    `${team.team_name} Linked With Move for Midfield Target`,
                    `${team.team_name} Scouting Department Active Ahead of Window`,
                    `${team.team_name} Manager Discusses Future Transfer Plans`,
                    `Reports Suggest ${team.team_name} Preparing Bid for Star Player`,
                    `${team.team_name} Enter Talks Over Potential New Signing`
                ];
                
                newsItems.push({
                    text: rumorTemplates[Math.floor(Math.random() * rumorTemplates.length)],
                    type: 'transfer'
                });
            });
        }
        
        // Fallback general news
        if (newsItems.length === 0) {
            newsItems.push(
                { text: `${window.gameState.selectedTeam.league_name} Fixtures Released for Coming Weeks`, type: 'general' },
                { text: `Manager Rotation Policy Continues Across League`, type: 'general' },
                { text: `Youth Development Focus Remains Priority for Clubs`, type: 'general' }
            );
        }
        
        // Take 3 most recent/interesting items
        const displayNews = newsItems.slice(0, 3);
        
        let html = '';
        displayNews.forEach(item => {
            html += `<div class="news-item ${item.type}">${item.text}</div>`;
        });

        feedEl.innerHTML = html;
    }

    /**
     * Render League Table Preview (top 7 teams)
     */
    function renderTablePreview() {
        const tableEl = document.getElementById('tablePreviewList');
        if (!tableEl || !window.gameState.selectedTeam) return;

        // Get league standings
        const standings = generateLeagueStandings();
        
        if (standings.length === 0) {
            tableEl.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.3);padding:20px;">No table data</div>';
            return;
        }

        let html = '';
        standings.slice(0, 7).forEach((team, index) => {
            const isUserTeam = team.team_name === window.gameState.selectedTeam.team_name;
            const position = index + 1;
            
            html += `
                <div class="table-row ${isUserTeam ? 'user-team' : ''}">
                    <div class="table-position">${position}</div>
                    <div class="table-badge">
                        ${team.club_logo_url ? 
                            `<img src="${team.club_logo_url}" alt="${team.team_name}">` : 
                            '⚽'}
                    </div>
                    <div class="table-team-name">${team.team_name}</div>
                    <div class="table-stat pld">${team.played || 4}</div>
                    <div class="table-stat pts">${team.points || (4 - index)}</div>
                </div>
            `;
        });

        tableEl.innerHTML = html;
    }

    /**
     * Generate league standings
     */
    function generateLeagueStandings() {
        if (!window.gameState.allTeams || !window.gameState.selectedTeam) return [];

        const leagueTeams = window.gameState.allTeams.filter(t => 
            t.league_name === window.gameState.selectedTeam.league_name
        );

        // Sort by overall rating for now (in real game, would use match results)
        return leagueTeams
            .sort((a, b) => (b.overall_rating || 70) - (a.overall_rating || 70))
            .slice(0, 7);
    }

})(window);
