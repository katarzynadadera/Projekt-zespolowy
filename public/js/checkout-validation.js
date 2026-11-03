document.addEventListener('DOMContentLoaded', function() {
    // Pola adresowe do walidacji w locie
    const firstNameInput = document.querySelector('input[name="first_name"]');
    const lastNameInput = document.querySelector('input[name="last_name"]');
    const cityInput = document.querySelector('input[name="city"]');
    const postalCodeInput = document.querySelector('input[name="postal_code"]');

    // Blokada wpisywania cyfr i znaków specjalnych dla imienia, nazwiska i miasta
    [firstNameInput, lastNameInput, cityInput].forEach(input => {
        if(input) {
            input.addEventListener('input', function(e) {
                // Zezwala tylko na litery (w tym polskie), spacje i myślniki
                e.target.value = e.target.value.replace(/[^a-zA-ZĄĆĘŁŃÓŚŹŻąćęłńóśźż\s\-]/g, '');
            });
        }
    });

    // Automatyczne formatowanie kodu pocztowego (XX-XXX)
    if(postalCodeInput) {
        postalCodeInput.addEventListener('input', function(e) {
            let v = e.target.value.replace(/\D/g, ''); // Usuń wszystko co nie jest cyfrą
            if (v.length > 2) {
                v = v.substring(0, 2) + '-' + v.substring(2, 5);
            }
            e.target.value = v.substring(0, 6); // Maksymalnie 6 znaków (razem z myślnikiem)
        });
    }

    // Pobranie elementów DOM
    const form = document.getElementById('checkout-form');
    const openBtn = document.getElementById('open-payment-btn');
    const modal = document.getElementById('payment-modal');
    const closeBtn = document.querySelector('.close-modal');
    const confirmBtn = document.getElementById('confirm-payment-btn');
    const paymentRadios = document.querySelectorAll('input[name="payment_method"]');
    const errorDiv = document.getElementById('payment-error');
    
    // Widoki wewnątrz modala
    const mainView = document.getElementById('payment-main-view');
    const processingView = document.getElementById('payment-processing-view');
    const successView = document.getElementById('payment-success-view');
    
    // Elementy statusu i sukcesu
    const statusText = document.getElementById('processing-status');
    const successTitle = successView ? successView.querySelector('h3') : null;
    const successMessage = successView ? successView.querySelector('p:nth-of-type(1)') : null;
    
    // Pola formularza płatności
    const cardInput = document.getElementById('card-number');
    const cardName = document.getElementById('card-name');
    const cardExpiry = document.getElementById('card-expiry');
    const cardCvc = document.getElementById('card-cvc');
    const blikInput = document.getElementById('blik-code');

    // Kontenery szczegółów płatności
    const cardDetails = document.getElementById('card-details');
    const blikDetails = document.getElementById('blik-details');
    const codDetails = document.getElementById('cod-details');

    // Zmienna przechowująca identyfikatory timerów (aby móc je wyczyścić przy zamknięciu)
    let simulationTimeouts = [];

    // Algorytm Luhna do weryfikacji poprawności numeru karty
    function isValidLuhn(number) {
        let sum = 0;
        let shouldDouble = false;
        number = number.replace(/\s/g, ''); 
        
        for (let i = number.length - 1; i >= 0; i--) {
            let digit = parseInt(number.charAt(i));
            if (shouldDouble) {
                if ((digit *= 2) > 9) digit -= 9;
            }
            sum += digit;
            shouldDouble = !shouldDouble;
        }
        return (sum % 10) == 0;
    }

    // Walidacja daty ważności karty (Format MM/YY)
    function isValidExpiry(expiry) {
        if (!expiry || expiry.length !== 5) return false;
        const [month, year] = expiry.split('/').map(num => parseInt(num, 10));
        
        if (!month || !year || month < 1 || month > 12) return false;
        
        const now = new Date();
        const currentYear = parseInt(now.getFullYear().toString().substr(-2));
        const currentMonth = now.getMonth() + 1;

        if (year < currentYear) return false;
        if (year === currentYear && month < currentMonth) return false;
        
        return true;
    }

    // Formatowanie w czasie rzeczywistym pól formularza
    if(cardInput) {
        cardInput.addEventListener('input', function(e) {
            let v = e.target.value.replace(/\D/g, '');
            v = v.substring(0, 16);
            let parts = [];
            for(let i=0; i<v.length; i+=4) parts.push(v.substring(i, i+4));
            e.target.value = parts.join(' ');
        });
    }

    if(cardExpiry) {
        cardExpiry.addEventListener('input', function(e) {
            let v = e.target.value.replace(/\D/g, ''); 
            if (v.length >= 2) {
                e.target.value = v.substring(0,2) + '/' + v.substring(2,4);
            } else {
                e.target.value = v;
            }
        });
    }

    if(cardName) {
        cardName.addEventListener('input', function(e) {
            // Dozwolone tylko litery i spacje
            let v = e.target.value.replace(/[^a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s]/g, '');
            e.target.value = v.toUpperCase();
        });
    }

    [cardCvc, blikInput].forEach(el => {
        if(el) {
            el.addEventListener('input', function(e) {
                e.target.value = e.target.value.replace(/\D/g, '');
            });
        }
    });

    // Obsługa UI (Modal i Widoki)
    if (openBtn) {
        openBtn.addEventListener('click', function() {
            // Najpierw walidujemy główny formularz
            if (form.checkValidity()) {
                modal.classList.add('active');
            } else {
                form.reportValidity();
            }
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    function closeModal() {
        modal.classList.remove('active');
        
        // Czyszczenie timerów symulacji jeśli użytkownik zamknie okno w trakcie
        simulationTimeouts.forEach(clearTimeout);
        simulationTimeouts = [];

        setTimeout(() => {
            resetModalState();
        }, 300);
    }

    function resetModalState() {
        mainView.style.display = 'block';
        processingView.style.display = 'none';
        successView.style.display = 'none';
        errorDiv.style.display = 'none';
        if (confirmBtn) confirmBtn.disabled = false;
        resetInputs();
    }

    function resetInputs() {
        if(cardInput) cardInput.value = '';
        if(cardName) cardName.value = '';
        if(cardExpiry) cardExpiry.value = '';
        if(cardCvc) cardCvc.value = '';
        if(blikInput) blikInput.value = '';
    }

    // Przełączanie widoku zależnie od metody płatności
    paymentRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            cardDetails.style.display = 'none';
            blikDetails.style.display = 'none';
            codDetails.style.display = 'none';
            errorDiv.style.display = 'none';
            
            if (this.value === 'card') {
                cardDetails.style.display = 'block';
                confirmBtn.innerText = "Zapłać i zamów";
            } else if (this.value === 'blik') {
                blikDetails.style.display = 'block';
                confirmBtn.innerText = "Zapłać BLIKiem";
            } else if (this.value === 'cod') {
                codDetails.style.display = 'block';
                confirmBtn.innerText = "Potwierdź zamówienie";
            }
        });
    });

    // Logika Walidacji i Zatwierdzania
    if (confirmBtn) {
        confirmBtn.addEventListener('click', function() {
            const checkedRadio = document.querySelector('input[name="payment_method"]:checked');
            if (!checkedRadio) return;

            const method = checkedRadio.value;
            // Ustawienie wartości w ukrytym polu głównego formularza
            const hiddenInput = document.getElementById('selected-payment-method');
            if (hiddenInput) hiddenInput.value = method;

            let isValid = true;
            let errorMsg = "";

            errorDiv.style.display = 'none';

            // Walidacja dla wybranej metody
            if (method === 'card') {
                const num = cardInput.value.replace(/\s/g, '');
                const name = cardName.value.trim();
                const expiry = cardExpiry.value;
                const cvc = cardCvc.value;

                if(!num || !name || !expiry || !cvc) {
                    isValid = false; errorMsg = "Wypełnij wszystkie dane karty.";
                } 
                else if (num.length !== 16 || !isValidLuhn(num)) {
                    isValid = false; errorMsg = "Numer karty jest nieprawidłowy.";
                } 
                else if (!isValidExpiry(expiry)) {
                    isValid = false; errorMsg = "Karta straciła ważność lub data jest błędna.";
                } 
                else if (cvc.length !== 3) {
                    isValid = false; errorMsg = "Kod CVC musi mieć 3 cyfry.";
                }
            }
            else if (method === 'blik') {
                const code = blikInput.value.trim();
                if (!code || code.length !== 6) {
                    isValid = false; errorMsg = "Kod BLIK musi składać się z 6 cyfr.";
                }
            }

            if (!isValid) {
                showError(errorMsg);
                return;
            }

            startSimulation(method);
        });
    }

    function showError(msg) {
        errorDiv.innerText = msg;
        errorDiv.style.display = 'block';
        errorDiv.animate([
            { transform: 'translateX(-5px)' },
            { transform: 'translateX(5px)' },
            { transform: 'translateX(0)' }
        ], { duration: 200, iterations: 2 });
    }

    // Symulacja Przetwarzania
    function startSimulation(method) {
        mainView.style.display = 'none';
        processingView.style.display = 'flex';
        confirmBtn.disabled = true; // Blokada przycisku
        
        let steps = [];
        
        if (method === 'card') {
            statusText.innerText = "Weryfikacja karty...";
            steps = [
                { time: 1500, text: "Autoryzacja w banku..." },
                { time: 3500, text: "Zatwierdzanie transakcji..." },
                { time: 4500, action: 'success' }
            ];
        } else if (method === 'blik') {
            statusText.innerText = "Weryfikacja kodu BLIK...";
            steps = [
                { time: 1000, text: "Oczekiwanie na potwierdzenie..." },
                { time: 4000, text: "Płatność potwierdzona!" },
                { time: 5000, action: 'success' }
            ];
        } else {
            statusText.innerText = "Rejestracja zamówienia...";
            steps = [
                { time: 1000, text: "Generowanie etykiety..." },
                { time: 2000, action: 'success' }
            ];
        }

        // Uruchomienie kroków z zapisaniem timeoutów
        steps.forEach(step => {
            const timeoutId = setTimeout(() => {
                if (step.action === 'success') {
                    showSuccessScreen(method);
                } else {
                    statusText.innerText = step.text;
                }
            }, step.time);
            simulationTimeouts.push(timeoutId);
        });
    }

    function showSuccessScreen(method) {
        processingView.style.display = 'none';
        successView.style.display = 'flex';
        
        if (method === 'cod') {
            successTitle.innerText = "Zamówienie przyjęte!";
            successMessage.innerText = "Płatność uregulujesz przy odbiorze przesyłki.";
            successTitle.style.color = "#0284c7"; 
        } else {
            successTitle.innerText = "Dziękujemy!";
            successMessage.innerText = "Twoje zamówienie zostało opłacone.";
            successTitle.style.color = "#065f46";
        }
        
        // Automatyczna wysyłka formularza po 3 sekundach
        const finalTimeout = setTimeout(() => {
            form.submit();
        }, 3000);
        simulationTimeouts.push(finalTimeout);
    }
});