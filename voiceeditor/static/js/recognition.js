var recognition = new webkitSpeechRecognition();
var lexer = null;
var mapping = null;
var saymapping = null;
var commands = null;
var features = null;
var random_messages = null;
var editor_id = null;

var refresh_time = 10000;
var lines_start = [];
var current_line_start = '';
var current_line_end = '';
var lines_end = [];
var selection = null;
var editor_lang = 'pas';
window.task = 1;
var minrmtime = 120000;
// var minrmtime = 0;
var maxrmtime = 480000;
// var maxrmtime = 1000;


recognition.continuous = true;
recognition.interimResults = true;
recognition.onstart = function() {
    console.info('Recognition started');
}

recognition.onresult = function(event) {
    var interim_transcript = '';
    var final_transcript = '';
    for (var i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
            // for (var j in event.results[i]) {
            //     console.log(j.toString() + ":" + event.results[i][j].transcript);
            // }
            final_transcript += event.results[i][0].transcript;
        } else {
            interim_transcript += event.results[i][0].transcript;
        }
    }
    $('#voice_input').val(interim_transcript);
    final_transcript = process_input(final_transcript.trim().toLowerCase());
};

recognition.onerror = function(event) {
    console.log('error', event);
    if (event.error == 'no-speech') {
        console.log('info_no_speech');
    }
    if (event.error == 'audio-capture') {
        console.log('info_no_microphone');
    }
    if (event.error == 'not-allowed') {
        console.log('not_allowed');
    }
};
recognition.onend = function() {
    // console.log('finished');
    // setTimeout('recognition.start()', 1000);
    recognition.start();
}

function htmlEncode(value){
  //create a in-memory div, set it's inner text(which jQuery automatically encodes)
  //then grab the encoded contents back out.  The div never exists on the page.
  return $('<div/>').text(value).html();
}


$(document).ready(function() {
    update_tables();
    final_transcript = '';
    recognition.lang = 'en-US';
    recognition.lang = 'sk-SK';
    recognition.start();
    refresh_lexer();
    refresh_editor();
    $('#voice_input_box').affix( { offset: { top: 0, bottom : 0}});
    setTimeout('sayrandom()', minrmtime + Math.floor(Math.random()*maxrmtime));
});

$(window).scroll(function () {
    $('#voice_input_box.affix').width($('#voice_input_box_placeholder').width());
});

$(window).resize(function () {
    $('#voice_input_box.affix').width($('#voice_input_box_placeholder').width());
});


// $(document).bind('contextmenu', function(e) {
//     e.stopPropagation();
//     e.preventDefault();
//     e.cancelBubble = true;
//     e.stopImmediatePropagation();
//     return false;
// });

$(document).bind('selectstart', function(e) {
    e.stopPropagation();
    e.preventDefault();
    e.cancelBubble = true;
    e.stopImmediatePropagation();
    return false;
});

function set_mapping(value) {
    window.mapping = value;
}

function set_saymapping(value) {
    window.saymapping = value;
}

function set_commands(value) {
    window.commands = value;
}

function set_tasks(value) {
    window.tasks = value;
}

function create_mapping_lexeme_function(chars) {
    return function(lexeme) {
        return {
            'type': 'mapping',
            'chars': chars
        }
    }
}

function create_saymapping_lexeme_function(chars, say) {
    return function(lexeme) {
        return {
            'type': 'saymapping',
            'chars': chars,
            'say': say
        }
    }
}

function create_command_lexeme_function(fname, prefixlen) {
    return function(lexeme) {
        console.log(lexeme);
        return {
            'type': 'command',
            'fname': fname,
            'args': lexeme.substring(prefixlen),
            'chars': ''
        }
    }
}


function refresh_lexer() {
    window.lexer = new Lexer(function(char) {
        return {
            'type': 'char',
            'chars': char
        }
    });

    for (var i in window.commands) {
        re = new RegExp(window.commands[i].fields.words
            + '\\s?(\\s*\\S*){'+window.commands[i].fields.command.fields.argnum +'}',
            'i'
        );
        var fname = window.commands[i].fields.command.fields.function;
        var prefixlen = window.commands[i].fields.words.length;
        window.lexer.addRule(re, create_command_lexeme_function(fname, prefixlen));
    }

    for (var i in window.mapping) {
        re = new RegExp(window.mapping[i].fields.words, 'i');
        var chars = window.mapping[i].fields.chars;
        window.lexer.addRule(re, create_mapping_lexeme_function(chars));
    }

    for (var i in window.saymapping) {
        re = new RegExp(window.saymapping[i].fields.words, 'i');
        var say = window.saymapping[i].fields.say;
        var chars = window.saymapping[i].fields.chars;
        window.lexer.addRule(re, create_saymapping_lexeme_function(chars, say));
    }
}

function set_features(value) {
    window.features = {};
    for(var i in value) {
        window.features[value[i].fields.name] = true;
    }
}

function set_randommessages(value) {
    window.random_messages = value;
}

function update_tables() {
    $.ajax({
      url: "/api/features/",
    }).done(function(data) {
      features = data;
      set_features(data);
      refresh_editor();
    });

    $.ajax({
      url: "/api/mapping/",
    }).success(function(data) {
      set_mapping(data);
      refresh_lexer();
    });

    $.ajax({
      url: "/api/saymapping/",
    }).success(function(data) {
      set_saymapping(data);
      refresh_lexer();
    });

    $.ajax({
      url: "/api/commands/",
    }).success(function(data) {
      set_commands(data);
      refresh_lexer();
    });

    $.ajax({
        url: "/api/tasks/",
    }).success(function(data) {
        set_tasks(data);
        update_tasklist();
    });

    $.ajax({
        url: "/api/randommessages/",
    }).success(function(data) {
        set_randommessages(data);
    });

    $.ajax({
        url: "/api/editorid/",
    }).success(function(data) {
        editor_id = data;
    });

    console.log(window.mapping);
    console.log(window.features);
    console.log(window.commands);
    console.log(window.saymapping);
    console.log(window.random_messages);
    console.log(window.tasks);
    window.setTimeout("update_tables()", refresh_time);
}

function update_tasklist() {
    $("#task-list").empty();
    for (var task in window.tasks) {
        // Add task to tasklist
        if ($.inArray(parseInt(editor_id), window.tasks[task].fields.editors) != -1) {
            var styl="style=color:green;";
        } else {
            var styl = '';
        }
        $("#task-list").append('<li><a id="task-' + task + '"' + styl + '>' + window.tasks[task].fields.name + '</a></li>');
        $("#task-"+task).click(function() {
            var id = $(this)[0].id.substr(5);
            window.task = window.tasks[id].pk;
            $("#task-name").text(window.tasks[id].fields.name);
            $("#task-content").text(window.tasks[id].fields.content);
        });
    }
}

function process_input(final_transcript) {
    lexer.setInput(final_transcript);
    while (1) {
        lexeme = lexer.lex();
        console.log(lexeme);
        if (typeof(lexeme) == "undefined") break;
        insert_text(lexeme.chars);
        if (lexeme.type == 'command') {
            process_command(lexeme.fname, lexeme.args);
        }
        if (lexeme.type == 'saymapping') {
            say(lexeme.say);
        }
    }
}

function process_command(command, args) {
    args = args.trim();
    args_array = args.split(' ');
    for (var i in args_array){
        args_array[i] = '"' + args_array[i] + '"';
    }
    eval(command + "(" + args_array.join(',') + ")");
}

function get_command(text) {
    for(var i in window.commands) {
        c = window.commands[i];
        pos = text.search(c.fields.words);
        if (pos != -1) {
            endpos = pos + c.fields.words.length;
            suffix = text.substring(endpos);
            args = suffix.split(' ', c.fields.command.fields.argnum);
            for (var j in args) {
                endpos += args[j].length + 1;
            }
            return {
                'fname': c.fields.command.fields.function,
                'args': args,
                'startpos': pos,
                'endpos': endpos
            };
        }
    }
    return null;
}

function get_mapping(text) {
    for(var i in window.mapping) {
        m = window.mapping[i];
        if (m.fields.words == text) {
            return m.fields.chars;
        }
    }
    return null;
}

function insert_text(text) {
    delete_selection();
    if (text == '') {
        return;
    }
    if (features.autospace) {
        text = text + ' ';
    }
    current_line_start += text;
    refresh_editor();
}

function select(selection, linetext) {
    if (selection == null) return linetext;
    console.log(selection.start, selection.end)
    text = linetext.substring(0, selection.start);
    text += '<span class="selected">';
    text += linetext.substring(selection.start, selection.end);
    text += '</span>';
    text += linetext.substring(selection.end);
    return text;
}

function create_line_selection(selection, first_line, last_line, line_size, prefix_count) {
    var start = 0;
    var end = line_size;
    console.log('cls:', selection.start, selection.end)
    if (first_line) {
        start =Math.min(line_size, Math.max(0, selection.start - prefix_count));
    }
    if (last_line) {
        end = Math.max(0,Math.min(line_size, selection.end - prefix_count));
    }
    sel = {'start': start, 'end': end};
    return sel;
 }

function refresh_editor() {
    editor = $('#editor');
    editor.empty();
    editor.removeClass('hljs');
    for (var i in lines_start) {
        var text = lines_start[i];
        if (window.selection!=null && i >= window.selection.line_start && i <= window.selection.line_end) {
            var first_line = (i == window.selection.line_start);
            var last_line = (i == window.selection.line_end);
            text = select(create_line_selection(window.selection, first_line, last_line, text.length, 0), htmlEncode(text));
        } else {
            text = htmlEncode(text)
        }
        editor.append("<li>"+text +"</li>");
    }

    var text1 = window.current_line_start;
    var text2 = window.current_line_end;
    if (window.selection != null && lines_start.length >= window.selection.line_start && lines_start.length <= window.selection.line_end) {
        var first_line = (lines_start.length == window.selection.line_start);
        var last_line = (lines_start.length == window.selection.line_end);
        text2 = select(create_line_selection(window.selection, first_line, last_line, text2.length, text1.length), htmlEncode(text2));
        text1 = select(create_line_selection(window.selection, first_line, last_line, text1.length, 0), htmlEncode(text1));
    } else {
        text1 = htmlEncode(text1);
        text2 = htmlEncode(text2);
    }

    editor.append(
        '<li class="current-line">'
        + text1
        + '<div class="cursor"></div>'
        + text2
        + "</li>");

    for (var i in lines_end) {
        var text = lines_end[i];
        if (window.selection!=null && i + lines_start.length + 1 >= window.selection.line_start && i + lines_start.length + 1 <= window.selection.line_end) {
            var first_line = (i + lines_start.length + 1 == window.selection.line_start);
            var last_line = (i + lines_start.length + 1 == window.selection.line_end);
            text = select(create_line_selection(window.selection, first_line, last_line, text.length, 0), text);
        } else {
            text = htmlEncode(text)
        }
        editor.append("<li>"+text +"</li>");
    }

    $('#lang').text(recognition.lang.substring(0,2));
    $('#editor_lang').text(editor_lang);

    if (window.features != null && 'highlight' in window.features) {
        $('#editor').each(function(i, e) {hljs.highlightBlock(e)});
    }
}

function delete_selection() {
    if (window.selection == null) return;
    var delete_start = lines_start.length;
    var delete_end = 0;

    for (var i in lines_start) {
        if (window.selection!=null && i >= window.selection.line_start && i <= window.selection.line_end) {
            var first_line = (i == window.selection.line_start);
            var last_line = (i == window.selection.line_end);
            if (first_line || last_line) {
                sel = create_line_selection(window.selection, first_line, last_line, lines_start[i].length, 0);
                lines_start[i] = lines_start[i].substring(0, sel.start) + lines_start[i].substring(sel.end);
            } else {
                delete_start = Math.min(i, delete_start);
                delete_end = Math.max(i, delete_end);
            }
        }
    }

    lines_start.splice(delete_start, delete_end);

    if (window.selection != null && lines_start.length >= window.selection.line_start && lines_start.length <= window.selection.line_end) {
        var first_line = (lines_start.length == window.selection.line_start);
        var last_line = (lines_start.length == window.selection.line_end);
        sel2 = create_line_selection(window.selection, first_line, last_line, window.current_line_end.length, window.current_line_start.length);
        sel1 = create_line_selection(window.selection, first_line, last_line, window.current_line_start.length, 0);
        window.current_line_end = window.current_line_end.substring(0, sel2.start) + window.current_line_end.substring(sel2.end);
        window.current_line_start = window.current_line_start.substring(0, sel1.start) + window.current_line_start.substring(sel1.end);
    }

    delete_start = lines_start.length;
    delete_end = 0;

    for (var i in lines_end) {
        if (window.selection!=null && i + lines_start.length + 1 >= window.selection.line_start && i + lines_start.length + 1 <= window.selection.line_end) {
            var first_line = (i + lines_start.length + 1 == window.selection.line_start);
            var last_line = (i + lines_start.length + 1 == window.selection.line_end);
            if (first_line || last_line) {
                sel = create_line_selection(window.selection, first_line, last_line, lines_end[i].length, 0);
                lines_end[i] = lines_end[i].substring(0, sel.start) + lines_end[i].substring(sel.end);
            } else {
                delete_start = Math.min(i, delete_start);
                delete_end = Math.max(i, delete_end);
            }
        }
    }
    lines_end.splice(delete_start, delete_end);
    if (selection.line_start != selection.line_end) {
        current_line_start = lines_start[lines_start.length-1] + current_line_start;
        lines_start.pop();
    }
    deselect();
    refresh_editor();
}

function say(text) {
    console.log('say:', text);
    var msg = new SpeechSynthesisUtterance();
    var voices = window.speechSynthesis.getVoices();
    msg.lang = 'sk-SK';
    msg.voice = voices[67]; // Note: some voices don't support altering params
    msg.voiceURI = 'native';
    msg.rate = 1; // 0.1 to 10
    msg.pitch = .7; //0 to 2
    msg.volume = 1; // 0 to 1
    msg.text = text;
    speechSynthesis.speak(msg);
}

function sayrandom() {
    if (random_messages != null) {
        message = random_messages[Math.floor(Math.random()*random_messages.length)];
        say(message);
    }
    setTimeout('sayrandom()', minrmtime + Math.floor(Math.random()*maxrmtime));
}
