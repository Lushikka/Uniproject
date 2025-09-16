(function(){
	const canteenId = window.CANTEEN_ID;
	const listEl = document.getElementById('publicItems');
	const searchInput = document.getElementById('searchInput');
	const filterVegBtn = document.getElementById('filterVeg');
	const filterNonVegBtn = document.getElementById('filterNonVeg');
	const clearFilterBtn = document.getElementById('filterAll');

	let allItems = [];
	let activeFilter = null; // 'veg' | 'non-veg' | null

	async function load() {
		try {
			const res = await fetch(`http://localhost:3000/menu-items?canteen_id=${encodeURIComponent(canteenId)}`);
			const data = await res.json();
			if (data.success) {
				allItems = data.items;
				render();
			}
		} catch (e) {
			console.error('Failed to load items', e);
		}
	}

	function normalize(str){
		return String(str || '').toLowerCase();
	}

	function itemMatchesSearch(item, term){
		const t = normalize(term);
		if (!t) return true;
		const name = normalize(item.item_name || item.name);
		const type = normalize(item.type);
		return name.includes(t) || type.includes(t);
	}

	function applyFilters(items){
		let filtered = items.filter(i => normalize(i.status) === 'available');
		const term = searchInput ? searchInput.value : '';
		filtered = filtered.filter(i => itemMatchesSearch(i, term));
		if (activeFilter === 'veg') filtered = filtered.filter(i => normalize(i.type) === 'veg');
		if (activeFilter === 'non-veg') filtered = filtered.filter(i => normalize(i.type) === 'non-veg');
		// if 'all' or null, no additional type filter
		return filtered;
	}

	const images = {
		rice: '../Images/rice.jpg',
		noodle: '../Images/nood.jpg',
		hopper: '../Images/hopp.jpg',
		juice: '../Images/nood.jpg',
		smoothie: '../Images/nood.jpg',
		kottu: '../Images/nood.jpg',
		pasta: '../Images/nood.jpg',
		sandwich: '../Images/nood.jpg',
		coffee: '../Images/nood.jpg',
		tea: '../Images/nood.jpg',
		curry: '../Images/rice.jpg'
	};

	function hashString(s){
		let h = 0; for (let i=0;i<s.length;i++){ h = ((h<<5)-h) + s.charCodeAt(i); h|=0; }
		return Math.abs(h);
	}

	function pickImageForItem(name){
		const n = normalize(name);
		for (const key of Object.keys(images)){
			if (n.includes(key)) return images[key];
		}
		// Fallback: rotate among available placeholders so not all look the same
		const pool = [images.rice, images.noodle, images.hopper];
		return pool[hashString(n) % pool.length];
	}

	function render(){
		if (!listEl) return;
		const items = applyFilters(allItems);
		listEl.innerHTML = items.map(item => {
			const name = item.item_name || '';
			const type = normalize(item.type);
			const tagClass = type === 'non-veg' ? 'nonveg' : 'veg';
			const imgSrc = pickImageForItem(name);
			return `
				<div class="menu-card">
					<img src="${imgSrc}" alt="${name}">
					<div class="menu-info">
						<h3>${name}</h3>
						<span class="tag ${tagClass}">${item.type}</span>
						<p>Rs. ${item.price} &nbsp; | &nbsp; ${item.status}</p>
					</div>
				</div>
			`;
		}).join('');
	}

	if (searchInput) searchInput.addEventListener('input', render);
	if (filterVegBtn) filterVegBtn.addEventListener('click', () => { activeFilter = 'veg'; render(); });
	if (filterNonVegBtn) filterNonVegBtn.addEventListener('click', () => { activeFilter = 'non-veg'; render(); });
	if (clearFilterBtn) clearFilterBtn.addEventListener('click', () => { activeFilter = 'all'; if (searchInput) searchInput.value = ''; render(); });

	document.addEventListener('DOMContentLoaded', load);
})();
