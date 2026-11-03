document.addEventListener('DOMContentLoaded', function() {
    // Konfiguracja Modala Sukcesu
    const modal = document.getElementById('success-modal');
    
    // Funkcja globalna do zamykania modala (dostępna dla przycisków w HTML)
    window.closeModal = function() {
        if (modal) modal.classList.remove('active');
    };

    // Zamykanie modala po kliknięciu w tło (overlay)
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) closeModal();
        });
    }

    // Obsługa formularzy "Dodaj do koszyka"
    const forms = document.querySelectorAll('.add-to-cart-form');

    forms.forEach(form => {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Pobranie danych z atrybutów formularza
            const bookId = this.dataset.bookId;
            const format = this.dataset.format;
            const button = this.querySelector('button');
            const originalButtonText = button.innerHTML;

            // Zablokowanie przycisku na czas żądania
            button.innerHTML = 'Dodawanie...';
            button.disabled = true;

            try {
                const response = await fetch('/cart/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ book_id: bookId, format: format })
                });

                const data = await response.json();

                // Obsługa braku autoryzacji (przekierowanie do logowania)
                if (response.status === 401) {
                    window.location.href = data.redirectUrl;
                    return;
                }

                if (data.success) {
                    // 1. Aktualizacja licznika w nawigacji
                    updateCartBadge(data.cartCount);

                    // 2. Aktualizacja listy w mini-koszyku (dropdown)
                    updateMiniCart(data);

                    // 3. Wyświetlenie modala z potwierdzeniem
                    showSuccessModal(modal, data.addedItem);
                } else {
                    alert('Błąd: ' + data.message);
                }

            } catch (error) {
                console.error('Błąd komunikacji z serwerem:', error);
                alert('Wystąpił błąd połączenia. Spróbuj ponownie.');
            } finally {
                // Przywrócenie stanu przycisku
                button.innerHTML = originalButtonText;
                button.disabled = false;
            }
        });
    });

    // Funkcje Pomocnicze UI 

    function updateCartBadge(count) {
        const cartLink = document.querySelector('.cart-link');
        let badge = document.querySelector('.cart-badge');
        
        if (badge) {
            badge.textContent = count;
            // Prosta animacja pulsowania
            badge.style.transform = "scale(1.3)";
            setTimeout(() => badge.style.transform = "scale(1)", 200);
        } else if (cartLink && count > 0) {
            // Utworzenie badge'a, jeśli jeszcze nie istnieje
            badge = document.createElement('span');
            badge.className = 'cart-badge';
            badge.textContent = count;
            cartLink.appendChild(badge);
        }
    }

    function showSuccessModal(modalElement, item) {
        if (!modalElement) return;

        const modalContent = modalElement.querySelector('.modal-content');
        let productInfo = modalContent.querySelector('.modal-product-preview');
        
        // Kontener na podgląd produktu
        if (!productInfo) {
            productInfo = document.createElement('div');
            productInfo.className = 'modal-product-preview';
            // Style inline dla zachowania spójności bez edycji CSS
            Object.assign(productInfo.style, {
                margin: "15px 0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "15px",
                textAlign: "left"
            });
            
            const actions = modalContent.querySelector('.modal-actions');
            if (actions) modalContent.insertBefore(productInfo, actions);
            else modalContent.appendChild(productInfo);
        }

        const formatLabel = item.format === 'digital' ? 'E-book' : 'Wersja Fizyczna';
        const coverSrc = item.cover || '/images/covers/no_cover.jpg';

        productInfo.innerHTML = `
            <img src="${coverSrc}" style="width: 50px; height: 75px; object-fit: cover; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div>
                <strong style="display:block; color: #333; font-size: 1rem;">${item.title}</strong>
                <span style="font-size: 0.85em; color: #666; display: block;">${formatLabel}</span>
                <span style="display:block; font-weight:bold; color: var(--primary-color, #4A90E2); margin-top: 4px;">${item.price} PLN</span>
            </div>
        `;

        // Opcjonalna zmiana nagłówka
        const modalHeader = modalElement.querySelector('h3');
        if (modalHeader) modalHeader.textContent = "Dodano do koszyka!";

        modalElement.classList.add('active');
    }

    function updateMiniCart(data) {
        const dropdown = document.querySelector('.cart-dropdown');
        const emptyMsg = document.querySelector('.empty-mini-cart');
        
        if (!dropdown) return;

        // Ukryj komunikat "koszyk jest pusty"
        if (emptyMsg) emptyMsg.style.display = 'none';

        // Znajdź lub stwórz listę przedmiotów
        let list = dropdown.querySelector('.cart-items-list');
        if (!list) {
            list = document.createElement('div');
            list.className = 'cart-items-list';
            dropdown.insertBefore(list, dropdown.firstChild);
        }

        // Dodaj stopkę z sumą, jeśli nie istnieje (pierwsze dodanie do pustego koszyka)
        if (!dropdown.querySelector('.mini-cart-footer')) {
            const footer = document.createElement('div');
            footer.className = 'mini-cart-footer';
            footer.innerHTML = `
                <div class="mini-total">Suma: <strong>0.00 PLN</strong></div>
                <a href="/checkout/cart" class="button small" style="width: 100%; display: block; text-align: center;">Przejdź do kasy</a>
            `;
            dropdown.appendChild(footer);
        }

        // Generowanie unikalnego ID dla wiersza w DOM
        const uniqueRowId = `cart-item-${data.addedItem.id}-${data.addedItem.format}`;
        const existingRow = list.querySelector(`#${uniqueRowId}`);
        const formatLabel = data.addedItem.format === 'digital' ? 'E-book' : 'Książka';
        const coverSrc = data.addedItem.cover || '/images/covers/no_cover.jpg';

        if (existingRow) {
            // Aktualizacja istniejącego wiersza (zwiększenie ilości)
            const detailsP = existingRow.querySelector('.mini-details');
            detailsP.innerHTML = `${formatLabel} <strong>x${data.addedItem.quantity}</strong>`;
            
            // Efekt wizualny aktualizacji
            existingRow.style.transition = "background-color 0.3s";
            existingRow.style.backgroundColor = "#e6fffa";
            setTimeout(() => existingRow.style.backgroundColor = "transparent", 500);
        } else {
            // Dodanie nowego wiersza
            const newItemHTML = `
                <div class="mini-cart-item" id="${uniqueRowId}" style="animation: fadeIn 0.3s ease-out;">
                    <img src="${coverSrc}" alt="Okładka">
                    <div class="mini-cart-info">
                        <p class="mini-title">${data.addedItem.title}</p>
                        <p class="mini-details">${formatLabel} <strong>x${data.addedItem.quantity}</strong></p>
                        <p class="mini-price">${data.addedItem.price} PLN</p>
                    </div>
                    <form action="/cart/remove" method="POST">
                        <input type="hidden" name="cart_item_id" value="${uniqueRowId}"> 
                        <button type="submit" class="mini-remove" title="Usuń z koszyka">✕</button>
                    </form>
                </div>
            `;
            list.insertAdjacentHTML('beforeend', newItemHTML);
        }

        // Aktualizacja sumy całkowitej
        const totalEl = dropdown.querySelector('.mini-total strong');
        if (totalEl) {
            totalEl.textContent = `${data.cartTotal} PLN`;
        }
    }
});